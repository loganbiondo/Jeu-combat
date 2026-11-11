import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView as RNWebView } from 'react-native-webview';
import { CHARACTERS, DEFAULT_SAVE, PROMPTS, SHOP, SaveData, pickPrompt } from './src/data';
import { GAME_HTML } from './src/gameHtml';

// Types RN WebView / React 19 parfois incompatibles dans tsc
const WebView = RNWebView as unknown as React.ComponentType<any>;

type Screen = 'home' | 'mode' | 'select' | 'combat' | 'ad' | 'victory' | 'shop' | 'howto';
type Setup = { mode: '1v1' | '2v2'; fusionReady?: boolean };

const ADS = [
  { title: 'Ki Cola Cosmique', body: 'Pétillante, douce, 100 % smash.' },
  { title: 'Trampolines Nuage™', body: 'Rebondis plus haut que ton ultra.' },
  { title: 'Cape Anti-Pub', body: 'Dispo dans la boutique.' }
];

export default function App() {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const webRef = useRef<any>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [save, setSave] = useState<SaveData>(DEFAULT_SAVE);
  const [loaded, setLoaded] = useState(false);
  const [setup, setSetup] = useState<Setup>({ mode: '1v1' });
  const [activeSlot, setActiveSlot] = useState(0);
  const [selections, setSelections] = useState<string[]>(['lumo', 'zib']);
  const [webReady, setWebReady] = useState(false);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [stageName, setStageName] = useState('');
  const [reward, setReward] = useState('');
  const [victoryTitle, setVictoryTitle] = useState('');
  const [adLeft, setAdLeft] = useState(3);
  const [ad, setAd] = useState(ADS[0]);
  const pendingVictory = useRef<null | (() => void)>(null);
  const moveDir = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('aki-save');
        if (raw) setSave({ ...DEFAULT_SAVE, ...JSON.parse(raw) });
      } catch {
        /* ignore */
      }
      setLoaded(true);
    })();
  }, []);

  const persist = useCallback(async (next: SaveData) => {
    setSave(next);
    await AsyncStorage.setItem('aki-save', JSON.stringify(next));
  }, []);

  const slotCount = setup.mode === '2v2' ? 4 : 2;

  const startSelect = (mode: '1v1' | '2v2', fusionReady = false) => {
    setSetup({ mode, fusionReady });
    const free = CHARACTERS.filter((c) => save.unlockedCharacters.includes(c.id) && c.id !== 'grok');
    const pool = free.length ? free : CHARACTERS.filter((c) => c.free && c.id !== 'grok');
    const next = Array.from({ length: mode === '2v2' ? 4 : 2 }, (_, i) => pool[i % pool.length].id);
    if (fusionReady) {
      const grok = CHARACTERS.find((c) => c.id === 'grok');
      if (grok && next.length > 1) next[1] = grok.id;
    }
    setSelections(next);
    setActiveSlot(0);
    setScreen('select');
  };

  const postToGame = (msg: object) => {
    webRef.current?.postMessage(JSON.stringify(msg));
  };

  const sendInput = (partial: Record<string, unknown>) => {
    postToGame({
      type: 'input',
      slot: 0,
      input: { moveX: moveDir.current, ...partial }
    });
  };

  const launchCombat = () => {
    setCombatLog([]);
    setWebReady(false);
    setScreen('combat');
  };

  useEffect(() => {
    if (screen !== 'combat' || !webReady) return;
    const fighters = selections.slice(0, slotCount).map((characterId, slot) => ({
      id: `p${slot}`,
      slot,
      team: setup.mode === '2v2' ? (slot < 2 ? 0 : 1) : slot,
      characterId,
      name: CHARACTERS.find((c) => c.id === characterId)?.name || characterId,
      stocks: 3
    }));
    // Simple CPU for other slots: game still runs; player controls slot 0
    postToGame({
      type: 'start',
      config: { mode: setup.mode, fighters, stocks: 3, fusionReady: !!setup.fusionReady }
    });
  }, [screen, webReady, selections, setup.mode, setup.fusionReady, slotCount]);

  // Lightweight CPU for slots > 0
  useEffect(() => {
    if (screen !== 'combat' || !webReady) return;
    const id = setInterval(() => {
      for (let slot = 1; slot < slotCount; slot++) {
        postToGame({
          type: 'input',
          slot,
          input: {
            moveX: Math.random() > 0.5 ? 1 : -1,
            jump: Math.random() > 0.92,
            attack: Math.random() > 0.85,
            special: Math.random() > 0.95,
            ultra: Math.random() > 0.985,
            regen: false
          }
        });
      }
    }, 180);
    return () => clearInterval(id);
  }, [screen, webReady, slotCount]);

  const finishToVictory = async (names: string) => {
    const picked = pickPrompt(save.promptHistory);
    const next = {
      ...save,
      promptHistory: [...save.promptHistory, picked.index].slice(-100),
      wins: save.wins + 1
    };
    await persist(next);
    setVictoryTitle(names || 'Match terminé');
    setReward(picked.text);
    const go = () => setScreen('victory');
    if (!save.adFree) {
      setAd(ADS[Math.floor(Math.random() * ADS.length)]);
      setAdLeft(3);
      pendingVictory.current = go;
      setScreen('ad');
    } else go();
  };

  useEffect(() => {
    if (screen !== 'ad') return;
    if (adLeft <= 0) return;
    const t = setTimeout(() => setAdLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [screen, adLeft]);

  const onWebMessage = (e: any) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.type === 'boot' || data.type === 'ready') {
        setWebReady(true);
        if (data.stage) setStageName(data.stage);
      }
      if (data.type === 'log' && Array.isArray(data.log)) {
        setCombatLog(data.log.map((l: { msg: string }) => l.msg));
      }
      if (data.type === 'ended') {
        const winners = new Set(data.winnerTeams || []);
        const names = (data.fighters || [])
          .filter((f: { team: number }) => winners.has(f.team))
          .map((f: { name: string }) => f.name)
          .join(' & ');
        finishToVictory(names);
      }
    } catch {
      /* ignore */
    }
  };

  const buy = async (productId: string) => {
    const product = SHOP.find((p) => p.id === productId);
    if (!product || save.ownedProducts.includes(productId)) return;
    const owned = [...save.ownedProducts, productId];
    const unlocked = new Set(save.unlockedCharacters);
    let adFree = save.adFree;
    if (product.type === 'adfree') adFree = true;
    if (product.type === 'character' && 'characterId' in product && product.characterId) {
      unlocked.add(product.characterId);
    }
    await persist({
      ...save,
      ownedProducts: owned,
      unlockedCharacters: [...unlocked],
      adFree
    });
  };

  const homeAd = useMemo(() => ADS[save.wins % ADS.length], [save.wins]);

  if (!loaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#38bdf8" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {screen === 'home' && (
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.brand}>ARENA KI FIGHTERS</Text>
          <Text style={styles.title}>Smash doux.{'\n'}Ki explosif.</Text>
          <Text style={styles.sub}>Teste avec Expo Go — Fusion Grok visible en combat.</Text>
          <View style={styles.fusionCard}>
            <Text style={styles.fusionTitle}>✦ Fusion Grok</Text>
            <Text style={styles.muted}>Jauge dorée → bouton FUSION → bannière « FUSION GROK ! »</Text>
          </View>
          <Btn label="Jouer Fusion Grok" onPress={() => startSelect('1v1', true)} primary />
          <Btn label="Jouer" onPress={() => setScreen('mode')} />
          <Btn label="Boutique" onPress={() => setScreen('shop')} />
          <Btn label="Commandes" onPress={() => setScreen('howto')} />
          {!save.adFree && (
            <View style={styles.adBanner}>
              <Text style={styles.adLabel}>Publicité</Text>
              <Text style={styles.adTitle}>{homeAd.title}</Text>
              <Text style={styles.muted}>{homeAd.body}</Text>
            </View>
          )}
          <Text style={styles.muted}>Victoires : {save.wins}</Text>
        </ScrollView>
      )}

      {screen === 'mode' && (
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.h2}>Mode</Text>
          <Text style={styles.muted}>Sur téléphone : tu joues le slot 1, l’IA gère les autres.</Text>
          <Btn label="Fusion Grok (jauge pleine)" onPress={() => startSelect('1v1', true)} primary />
          <Btn label="1v1 (toi vs IA)" onPress={() => startSelect('1v1')} />
          <Btn label="2v2 (toi + IA vs IA)" onPress={() => startSelect('2v2')} />
          <Btn label="Retour" onPress={() => setScreen('home')} />
        </ScrollView>
      )}

      {screen === 'select' && (
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.h2}>Personnages</Text>
          <View style={styles.rowWrap}>
            {selections.slice(0, slotCount).map((id, i) => (
              <Pressable
                key={i}
                onPress={() => setActiveSlot(i)}
                style={[styles.chip, activeSlot === i && styles.chipOn]}
              >
                <Text style={[styles.chipText, activeSlot === i && { color: '#0b1220' }]}>
                  J{i + 1}: {CHARACTERS.find((c) => c.id === id)?.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.grid}>
            {CHARACTERS.map((ch) => {
              const unlocked = save.unlockedCharacters.includes(ch.id);
              return (
                <Pressable
                  key={ch.id}
                  disabled={!unlocked && activeSlot !== 0}
                  onPress={() => {
                    if (!unlocked) {
                      setScreen('shop');
                      return;
                    }
                    const next = [...selections];
                    next[activeSlot] = ch.id;
                    setSelections(next);
                  }}
                  style={[
                    styles.card,
                    { borderColor: ch.colors.accent },
                    selections[activeSlot] === ch.id && styles.cardOn,
                    !unlocked && styles.cardLocked
                  ]}
                >
                  <View style={[styles.swatch, { backgroundColor: ch.colors.body }]} />
                  <Text style={styles.cardTitle}>{ch.name}</Text>
                  <Text style={styles.muted}>{unlocked ? ch.tagline : 'Boutique'}</Text>
                </Pressable>
              );
            })}
          </View>
          <Btn label="Lancer le combat" onPress={launchCombat} primary />
          <Btn label="Retour" onPress={() => setScreen('mode')} />
        </ScrollView>
      )}

      {screen === 'combat' && (
        <View style={styles.combat}>
          <View style={[styles.webWrap, { height: landscape ? height * 0.62 : height * 0.42 }]}>
            <WebView
              ref={webRef}
              originWhitelist={['*']}
              source={{ html: GAME_HTML }}
              onMessage={onWebMessage}
              allowFileAccess
              javaScriptEnabled
              domStorageEnabled
              mediaPlaybackRequiresUserAction={false}
              style={styles.webview}
              onLoadEnd={() => {
                // Some Android builds need a nudge
                setTimeout(() => setWebReady(true), 200);
              }}
            />
          </View>
          <Text style={styles.stage}>{stageName || 'Arène'}</Text>
          <ScrollView horizontal style={styles.logLine} contentContainerStyle={{ gap: 8 }}>
            {combatLog.slice(0, 4).map((m, i) => (
              <Text key={i} style={styles.logItem}>
                {m}
              </Text>
            ))}
          </ScrollView>

          <View style={styles.controls}>
            <View style={styles.dpad}>
              <Hold
                label="◀"
                onPressIn={() => {
                  moveDir.current = -1;
                  sendInput({ moveX: -1 });
                }}
                onPressOut={() => {
                  moveDir.current = 0;
                  sendInput({ moveX: 0 });
                }}
              />
              <Hold
                label="▶"
                onPressIn={() => {
                  moveDir.current = 1;
                  sendInput({ moveX: 1 });
                }}
                onPressOut={() => {
                  moveDir.current = 0;
                  sendInput({ moveX: 0 });
                }}
              />
              <Hold
                label="Jump"
                onPressIn={() => sendInput({ jump: true })}
                onPressOut={() => sendInput({ jump: false })}
              />
            </View>
            <View style={styles.actions}>
              <Hold label="Atk" accent="#fde047" onPressIn={() => sendInput({ attack: true })} onPressOut={() => sendInput({ attack: false })} />
              <Hold label="Spé" accent="#38bdf8" onPressIn={() => sendInput({ special: true })} onPressOut={() => sendInput({ special: false })} />
              <Hold label="ULTRA" accent="#fb7185" onPressIn={() => sendInput({ ultra: true })} onPressOut={() => sendInput({ ultra: false })} />
              <Hold label="FUSION" accent="#f5d657" onPressIn={() => sendInput({ fusion: true })} onPressOut={() => sendInput({ fusion: false })} />
              <Hold label="Regen" accent="#4ade80" onPressIn={() => sendInput({ regen: true })} onPressOut={() => sendInput({ regen: false })} />
            </View>
          </View>
          <Btn label="Abandonner" onPress={() => postToGame({ type: 'forfeit' })} />
        </View>
      )}

      {screen === 'ad' && (
        <View style={styles.pad}>
          <Text style={styles.adLabel}>Publicité</Text>
          <Text style={styles.h2}>{ad.title}</Text>
          <Text style={styles.sub}>{ad.body}</Text>
          <Btn
            label={adLeft > 0 ? `Passer (${adLeft})` : 'Continuer'}
            disabled={adLeft > 0}
            primary
            onPress={() => {
              pendingVictory.current?.();
              pendingVictory.current = null;
            }}
          />
          <Btn label="Mode sans pub" onPress={() => setScreen('shop')} />
        </View>
      )}

      {screen === 'victory' && (
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.brand}>Victoire</Text>
          <Text style={styles.title}>{victoryTitle}</Text>
          <View style={styles.reward}>
            <Text style={styles.rewardTitle}>Récompense</Text>
            <Text style={styles.sub}>{reward}</Text>
          </View>
          <Btn label="Menu" onPress={() => setScreen('home')} primary />
          <Btn label="Boutique" onPress={() => setScreen('shop')} />
        </ScrollView>
      )}

      {screen === 'shop' && (
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.h2}>Boutique</Text>
          <Text style={styles.muted}>
            Achat sandbox (Expo Go). Plus tard : Google Play Billing pour le Play Store.
          </Text>
          {SHOP.map((p) => {
            const owned = save.ownedProducts.includes(p.id);
            return (
              <View key={p.id} style={styles.shopCard}>
                <Text style={styles.cardTitle}>
                  {p.icon} {p.name}
                </Text>
                <Text style={styles.muted}>{p.description}</Text>
                <Text style={styles.price}>{p.price}</Text>
                <Btn label={owned ? 'Possédé' : 'Acheter (sandbox)'} disabled={owned} primary={!owned} onPress={() => buy(p.id)} />
              </View>
            );
          })}
          <Btn label="Retour" onPress={() => setScreen('home')} />
        </ScrollView>
      )}

      {screen === 'howto' && (
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.h2}>Commandes tactiles</Text>
          <Text style={styles.sub}>◀ ▶ déplacer · Jump · Atk · Spé · ULTRA · FUSION · Regen</Text>
          <Text style={styles.sub}>Remplis le ki en frappant, puis ULTRA pour le cut-in spectaculaire.</Text>
          <Text style={styles.sub}>Fusion Grok : jauge dorée sous le ki → FUSION → bannière + forme Héros × Grok.</Text>
          <Text style={styles.sub}>Expo Go = test. Play Store = build EAS plus tard.</Text>
          <Btn label="Retour" onPress={() => setScreen('home')} />
        </ScrollView>
      )}
    </View>
  );
}

function Btn({
  label,
  onPress,
  primary,
  disabled
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        primary && styles.btnPrimary,
        disabled && styles.btnDisabled,
        pressed && !disabled && { opacity: 0.85 }
      ]}
    >
      <Text style={[styles.btnText, primary && styles.btnTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

function Hold({
  label,
  onPressIn,
  onPressOut,
  accent
}: {
  label: string;
  onPressIn: () => void;
  onPressOut: () => void;
  accent?: string;
}) {
  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={({ pressed }) => [
        styles.hold,
        accent ? { borderColor: accent } : null,
        pressed && styles.holdOn
      ]}
    >
      <Text style={styles.holdText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07111f' },
  center: { flex: 1, backgroundColor: '#07111f', alignItems: 'center', justifyContent: 'center' },
  pad: { padding: 22, paddingTop: 56, gap: 12 },
  brand: {
    color: '#fde047',
    fontWeight: '800',
    letterSpacing: 3,
    fontSize: 13
  },
  title: { color: '#f8fafc', fontSize: 36, fontWeight: '800', lineHeight: 40 },
  h2: { color: '#f8fafc', fontSize: 28, fontWeight: '800' },
  sub: { color: '#9fb3c8', fontSize: 16, lineHeight: 22 },
  muted: { color: '#9fb3c8', fontSize: 13 },
  btn: {
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.35)',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.6)'
  },
  btnPrimary: {
    backgroundColor: '#38bdf8',
    borderColor: '#38bdf8'
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#e8eef7', fontWeight: '800', fontSize: 16 },
  btnTextPrimary: { color: '#0b1220' },
  adBanner: {
    marginTop: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(251,113,133,0.45)',
    backgroundColor: 'rgba(15,23,42,0.85)',
    gap: 4
  },
  adLabel: { color: '#fb7185', fontWeight: '800', letterSpacing: 1, fontSize: 11 },
  adTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  fusionCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,214,87,0.5)',
    backgroundColor: 'rgba(15,23,42,0.85)',
    gap: 4
  },
  fusionTitle: { color: '#f5d657', fontWeight: '800', fontSize: 16 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.35)'
  },
  chipOn: { backgroundColor: '#fde047', borderColor: '#fde047' },
  chipText: { color: '#e8eef7', fontWeight: '700', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '47%',
    borderWidth: 2,
    borderRadius: 14,
    padding: 10,
    backgroundColor: 'rgba(15,23,42,0.75)'
  },
  cardOn: { backgroundColor: 'rgba(56,189,248,0.15)' },
  cardLocked: { opacity: 0.45 },
  swatch: { height: 40, borderRadius: 10, marginBottom: 6 },
  cardTitle: { color: '#fff', fontWeight: '800' },
  combat: { flex: 1, paddingTop: 40, paddingHorizontal: 10, gap: 6 },
  webWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.35)'
  },
  webview: { flex: 1, backgroundColor: '#0b1d3a' },
  stage: { color: '#9fb3c8', textAlign: 'center', fontWeight: '700' },
  logLine: { maxHeight: 28 },
  logItem: { color: '#94a3b8', fontSize: 11 },
  controls: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 6 },
  dpad: { flexDirection: 'row', gap: 8, flex: 1, flexWrap: 'wrap' },
  actions: { flexDirection: 'row', gap: 8, flex: 1, flexWrap: 'wrap', justifyContent: 'flex-end' },
  hold: {
    minWidth: 64,
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(125,211,252,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.85)',
    paddingHorizontal: 8
  },
  holdOn: { backgroundColor: 'rgba(56,189,248,0.35)' },
  holdText: { color: '#f8fafc', fontWeight: '800' },
  reward: {
    borderWidth: 1,
    borderColor: 'rgba(253,224,71,0.45)',
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(15,23,42,0.7)',
    gap: 8
  },
  rewardTitle: { color: '#fde047', fontWeight: '800', fontSize: 16 },
  shopCard: {
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.3)',
    borderRadius: 14,
    padding: 14,
    gap: 6,
    backgroundColor: 'rgba(15,23,42,0.7)'
  },
  price: { color: '#38bdf8', fontWeight: '800' }
});

// silence unused in some TS configs
void PROMPTS;
