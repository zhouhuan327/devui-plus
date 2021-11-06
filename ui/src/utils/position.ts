/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { isUndefined } from 'lodash';

import { toPx } from './to-px';

function getParentPositioned(el: HTMLElement) {
  const loop = (_el: HTMLElement): HTMLElement => {
    if (_el.parentElement) {
      const { position } = getComputedStyle(_el.parentElement);
      if (position !== 'static') {
        return _el.parentElement;
      } else {
        return loop(_el.parentElement);
      }
    } else {
      return document.body;
    }
  };
  return loop(el);
}

export function getFillingStyle(
  el: HTMLElement,
  container: HTMLElement,
  fixed = true
): {
  top: number;
  left: number;
  width: number;
  height: number;
} {
  const {
    borderTopWidth: _borderTopWidth,
    borderRightWidth: _borderRightWidth,
    borderBottomWidth: _borderBottomWidth,
    borderLeftWidth: _borderLeftWidth,
  } = getComputedStyle(container);
  const borderTopWidth = toPx(_borderTopWidth, true);
  const borderRightWidth = toPx(_borderRightWidth, true);
  const borderBottomWidth = toPx(_borderBottomWidth, true);
  const borderLeftWidth = toPx(_borderLeftWidth, true);

  const targetRect = container.getBoundingClientRect();

  let offsetTop = 0;
  let offsetLeft = 0;
  if (!fixed) {
    const parentEl = getParentPositioned(el);
    const parentRect = parentEl.getBoundingClientRect();
    offsetTop = parentEl.scrollTop - parentRect.top;
    offsetLeft = parentEl.scrollLeft - parentRect.left;
  }

  return {
    top: targetRect.top + borderTopWidth + offsetTop,
    left: targetRect.left + borderLeftWidth + offsetLeft,
    width: targetRect.width - (borderLeftWidth + borderRightWidth),
    height: targetRect.height - (borderTopWidth + borderBottomWidth),
  };
}

export type DPlacement =
  | 'top'
  | 'top-left'
  | 'top-right'
  | 'right'
  | 'right-top'
  | 'right-bottom'
  | 'bottom'
  | 'bottom-left'
  | 'bottom-right'
  | 'left'
  | 'left-top'
  | 'left-bottom';

export function getPopupPlacementStyle(
  el: HTMLElement,
  targetEl: HTMLElement,
  placement: DPlacement,
  offset = 10,
  fixed = true,
  overOptions?: {
    space?: [number, number, number, number];
    default?: DPlacement;
  }
): {
  top: number;
  left: number;
  placement: DPlacement;
} {
  const { width, height } = el.getBoundingClientRect();

  const targetRect = targetEl.getBoundingClientRect();

  let offsetTop = 0;
  let offsetLeft = 0;
  if (!fixed) {
    const parentEl = getParentPositioned(el);
    const parentRect = parentEl.getBoundingClientRect();
    offsetTop = parentEl.scrollTop - parentRect.top;
    offsetLeft = parentEl.scrollLeft - parentRect.left;
  }

  const getFixedPosition = (placement: DPlacement) => {
    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = targetRect.top - height - offset;
        left = targetRect.left + (targetRect.width - width) / 2;
        break;

      case 'top-left':
        top = targetRect.top - height - offset;
        left = targetRect.left;
        break;

      case 'top-right':
        top = targetRect.top - height - offset;
        left = targetRect.left + targetRect.width - width;
        break;

      case 'right':
        top = targetRect.top + (targetRect.height - height) / 2;
        left = targetRect.left + targetRect.width + offset;
        break;

      case 'right-top':
        top = targetRect.top;
        left = targetRect.left + targetRect.width + offset;
        break;

      case 'right-bottom':
        top = targetRect.top + targetRect.height - height;
        left = targetRect.left + targetRect.width + offset;
        break;

      case 'bottom':
        top = targetRect.top + targetRect.height + offset;
        left = targetRect.left + (targetRect.width - width) / 2;
        break;

      case 'bottom-left':
        top = targetRect.top + targetRect.height + offset;
        left = targetRect.left;
        break;

      case 'bottom-right':
        top = targetRect.top + targetRect.height + offset;
        left = targetRect.left + targetRect.width - width;
        break;

      case 'left':
        top = targetRect.top + (targetRect.height - height) / 2;
        left = targetRect.left - width - offset;
        break;

      case 'left-top':
        top = targetRect.top;
        left = targetRect.left - width - offset;
        break;

      case 'left-bottom':
        top = targetRect.top + targetRect.height - height;
        left = targetRect.left - width - offset;

        break;

      default:
        break;
    }
    return { top, left };
  };

  const getAutoFixedPosition = (placements: DPlacement[]) => {
    for (const placement of placements) {
      const { top, left } = getFixedPosition(placement);
      const noOver = [top, window.innerWidth - left - width, window.innerHeight - top - height, left].every(
        (num, index) => num >= overOptions!.space![index]
      );
      if (noOver) {
        return { top, left, placement };
      }
    }
    return {
      ...getFixedPosition(overOptions!.default!),
      placement: overOptions!.default!,
    };
  };

  let positionStyle: { top: number; left: number; placement: DPlacement } = { top: 0, left: 0, placement };
  if (!isUndefined(overOptions)) {
    if (placement.startsWith('top')) {
      positionStyle = getAutoFixedPosition([
        placement,
        'right',
        'right-top',
        'right-bottom',
        'left',
        'left-top',
        'left-bottom',
        ...(placement === 'top'
          ? (['bottom', 'bottom-left', 'bottom-right'] as const)
          : placement === 'top-left'
          ? (['bottom-left', 'bottom', 'bottom-right'] as const)
          : (['bottom-right', 'bottom', 'bottom-left'] as const)),
      ]);
    }
    if (placement.startsWith('right')) {
      positionStyle = getAutoFixedPosition([
        placement,
        'top',
        'top-left',
        'top-right',
        'bottom',
        'bottom-left',
        'bottom-right',
        ...(placement === 'right'
          ? (['left', 'left-top', 'left-bottom'] as const)
          : placement === 'right-top'
          ? (['left-top', 'left', 'left-bottom'] as const)
          : (['left-bottom', 'left', 'left-top'] as const)),
      ]);
    }
    if (placement.startsWith('bottom')) {
      positionStyle = getAutoFixedPosition([
        placement,
        'right',
        'right-top',
        'right-bottom',
        'left',
        'left-top',
        'left-bottom',
        ...(placement === 'bottom'
          ? (['top', 'top-left', 'top-right'] as const)
          : placement === 'bottom-left'
          ? (['top-left', 'top', 'top-right'] as const)
          : (['top-right', 'top', 'top-left'] as const)),
      ]);
    }
    if (placement.startsWith('left')) {
      positionStyle = getAutoFixedPosition([
        placement,
        'top',
        'top-left',
        'top-right',
        'bottom',
        'bottom-left',
        'bottom-right',
        ...(placement === 'left'
          ? (['right', 'right-top', 'right-bottom'] as const)
          : placement === 'left-top'
          ? (['right-top', 'right', 'right-bottom'] as const)
          : (['right-bottom', 'right', 'right-top'] as const)),
      ]);
    }
  } else {
    positionStyle = {
      ...getFixedPosition(placement),
      placement,
    };
  }

  return {
    top: positionStyle.top + offsetTop,
    left: positionStyle.left + offsetLeft,
    placement: positionStyle.placement,
  };
}

export function getFixedSideStyle(el: HTMLElement, targetEl: HTMLElement, placement: 'right' | 'left' = 'right', offset = 10) {
  const { width, height } = el.getBoundingClientRect();

  const targetRect = targetEl.getBoundingClientRect();

  let top = Math.max(targetRect.top, 10);
  top = Math.min(top, window.innerHeight - height - 10);

  const left = placement === 'right' ? targetRect.left + targetRect.width + offset : targetRect.left - width - offset;

  return {
    top,
    left,
    transformOrigin: `${placement === 'right' ? 'left' : 'right'} ${Math.min(targetRect.top - top + targetRect.height / 2, height)}px`,
  };
}
