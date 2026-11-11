/**
 * Client Socket.io — charge la lib via script tag globale `io`.
 */
export class NetClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.room = null;
    this.handlers = {};
  }

  on(event, cb) {
    if (!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(cb);
  }

  emitLocal(event, data) {
    (this.handlers[event] || []).forEach((cb) => cb(data));
  }

  connect(url) {
    if (typeof io === 'undefined') {
      return Promise.reject(new Error('socket.io client manquant'));
    }
    return new Promise((resolve, reject) => {
      this.socket = io(url, { transports: ['websocket', 'polling'] });
      this.socket.on('connect', () => {
        this.connected = true;
        resolve(true);
      });
      this.socket.on('connect_error', (err) => reject(err));
      this.socket.on('server:hello', (d) => this.emitLocal('hello', d));
      this.socket.on('queue:joined', (d) => this.emitLocal('queue:joined', d));
      this.socket.on('queue:left', (d) => this.emitLocal('queue:left', d));
      this.socket.on('match:found', (d) => {
        this.room = d;
        this.emitLocal('match:found', d);
      });
      this.socket.on('match:start', (d) => this.emitLocal('match:start', d));
      this.socket.on('match:input', (d) => this.emitLocal('match:input', d));
      this.socket.on('match:state', (d) => this.emitLocal('match:state', d));
      this.socket.on('match:event', (d) => this.emitLocal('match:event', d));
      this.socket.on('match:end', (d) => this.emitLocal('match:end', d));
      this.socket.on('match:peer-left', (d) => this.emitLocal('match:peer-left', d));
    });
  }

  joinQueue({ mode, name, characterId }) {
    this.socket?.emit('queue:join', { mode, name, characterId });
  }

  leaveQueue() {
    this.socket?.emit('queue:leave');
  }

  sendInput(input) {
    this.socket?.emit('match:input', input);
  }

  sendState(state) {
    this.socket?.emit('match:state', state);
  }

  sendEnd(payload) {
    this.socket?.emit('match:end', payload);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.connected = false;
    this.room = null;
  }
}
