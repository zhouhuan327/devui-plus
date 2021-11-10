import { isUndefined } from 'lodash';
import React, { useCallback, useMemo } from 'react';
import { useImmer } from 'use-immer';

import { useDPrefixConfig } from '../../hooks';
import { getClassName } from '../../utils';
import { DTransition } from '../_transition';

export interface DMaskProps extends React.HTMLAttributes<HTMLDivElement> {
  dVisible?: boolean;
  afterVisibleChange?: (visible: boolean) => void;
}

export function DMask(props: DMaskProps) {
  const { dVisible, afterVisibleChange, className, onClick, ...restProps } = props;

  const dPrefix = useDPrefixConfig();

  //#region States.
  /*
   * @see https://reactjs.org/docs/state-and-lifecycle.html
   *
   * - Vue: data.
   * @see https://v3.vuejs.org/api/options-data.html#data-2
   * - Angular: property on a class.
   * @example
   * export class HeroChildComponent {
   *   public data: 'example';
   * }
   */
  const [autoVisible, setAutoVisible] = useImmer(false);
  //#endregion

  //#region Getters.
  /*
   * When the dependency changes, recalculate the value.
   * In React, usually use `useMemo` to handle this situation.
   * Notice: `useCallback` also as getter that target at function.
   *
   * - Vue: computed.
   * @see https://v3.vuejs.org/guide/computed.html#computed-properties
   * - Angular: get property on a class.
   * @example
   * // ReactConvertService is a service that implement the
   * // methods when need to convert react to angular.
   * export class HeroChildComponent {
   *   public get data():string {
   *     return this.reactConvert.useMemo(factory, [deps]);
   *   }
   *
   *   constructor(private reactConvert: ReactConvertService) {}
   * }
   */
  const visible = useMemo(() => (isUndefined(dVisible) ? autoVisible : dVisible), [dVisible, autoVisible]);

  const handleClick = useCallback(
    (e) => {
      onClick?.(e);
      setAutoVisible(false);
    },
    [onClick, setAutoVisible]
  );
  //#endregion

  return (
    <DTransition
      dVisible={visible}
      dStateList={{
        'enter-from': { opacity: '0' },
        'enter-to': { transition: 'opacity 0.1s linear' },
        'leave-to': { opacity: '0', transition: 'opacity 0.1s linear' },
      }}
      dCallbackList={{
        afterEnter: () => {
          afterVisibleChange?.(true);
        },
        afterLeave: () => {
          afterVisibleChange?.(false);
        },
      }}
    >
      <div {...restProps} className={getClassName(className, `${dPrefix}mask`)} onClick={handleClick}></div>
    </DTransition>
  );
}
