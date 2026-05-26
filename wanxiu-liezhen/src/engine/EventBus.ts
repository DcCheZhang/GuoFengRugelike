type EventHandler = (data: any) => void;

class EventBusClass {
  private handlers: Record<string, EventHandler[]> = {};

  on(event: string, fn: EventHandler): void {
    if (!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(fn);
  }

  off(event: string, fn: EventHandler): void {
    if (!this.handlers[event]) return;
    this.handlers[event] = this.handlers[event].filter((f) => f !== fn);
  }

  once(event: string, fn: EventHandler): void {
    const wrapper = (data: any) => {
      fn(data);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  emit(event: string, data?: any): void {
    if (!this.handlers[event]) return;
    for (const fn of this.handlers[event]) {
      try {
        fn(data);
      } catch (err) {
        console.error(err);
      }
    }
  }
}

export const EventBus = new EventBusClass();

export const GameEvent = {
  VIEW_CHANGE: 'vc',
  BATTLE_START: 'bs',
  BATTLE_END: 'be',
  UNIT_DIED: 'ud',
  UNIT_REVIVE: 'ur',
  GOLD_CHANGE: 'gc',
  SPIRIT_CHANGE: 'sc',
  SYNTH_SUCCESS: 'ss',
  TOAST: 't',
} as const;
