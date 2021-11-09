import React, { useMemo } from 'react';

export interface DDisabledProps {
  dDisabled: boolean;
  children: React.ReactNode;
}

export function DDisabled(props: DDisabledProps) {
  const { dDisabled, children } = props;

  //#region React.cloneElement.
  /*
   * @see https://reactjs.org/docs/react-api.html#cloneelement
   *
   * - Vue: Scoped Slots.
   * @see https://v3.vuejs.org/guide/component-slots.html#scoped-slots
   * - Angular: NgTemplateOutlet.
   * @see https://angular.io/api/common/NgTemplateOutlet
   */
  const child = useMemo(() => {
    const _child = children as React.ReactElement;
    let props: React.HTMLAttributes<HTMLElement> = {};
    if (dDisabled) {
      props = {
        className: _child.props.className ? _child.props.className + ' is-disabled' : 'is-disabled',
        'aria-disabled': true,
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
        },
        onFocus: (e) => {
          e.preventDefault();
          e.stopPropagation();
        },
      };
    }
    return React.cloneElement(_child, {
      ..._child.props,
      ...props,
    });
  }, [dDisabled, children]);
  //#endregion

  return child;
}
