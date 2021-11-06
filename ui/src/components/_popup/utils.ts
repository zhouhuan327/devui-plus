import { useEffect } from 'react';
import { useImmer } from 'use-immer';

export class LockOperation {
  private lockTime = 20;
  private lockTid: number | null = null;
  private operationTids = new Map<symbol, number>();

  clearTids() {
    if (this.lockTid) {
      clearTimeout(this.lockTid);
    }
    for (const tid of this.operationTids.values()) {
      clearTimeout(tid);
    }
  }

  lock() {
    for (const tid of this.operationTids.values()) {
      clearTimeout(tid);
    }
    this.operationTids.clear();

    if (this.lockTid) {
      clearTimeout(this.lockTid);
    }
    this.lockTid = window.setTimeout(() => {
      this.lockTid = null;
    }, this.lockTime);
  }

  handleOperation(operation: () => void) {
    if (this.lockTid === null) {
      const key = Symbol();
      this.operationTids.set(
        key,
        window.setTimeout(() => {
          this.operationTids.delete(key);
          operation();
        }, this.lockTime)
      );
    }
  }
}

export function useLockOperation() {
  const [lockOperation] = useImmer(new LockOperation());

  useEffect(() => {
    lockOperation.clearTids();
  }, [lockOperation]);

  return lockOperation;
}
