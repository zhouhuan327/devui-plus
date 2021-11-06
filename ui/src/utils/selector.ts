import { isFunction, isString } from 'lodash';

export type DElementSelector = HTMLElement | null | string | (() => HTMLElement | null);

export function getElement(selector: DElementSelector): HTMLElement | null {
  if (isString(selector)) {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) {
      console.error(`Cant find element by ${selector}`);
    }
    return el;
  } else if (isFunction(selector)) {
    return selector();
  } else {
    return selector;
  }
}
