import { isUndefined } from 'lodash';
import React, { useMemo } from 'react';

import { useDPrefixConfig, useDComponentConfig } from '../../hooks';
import { getClassName } from '../../utils';
import { generateChildren } from './utils';

export interface DMenuGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  dTitle: React.ReactNode;
  __level?: number;
}

export function DMenuGroup(props: DMenuGroupProps) {
  const { dTitle, __level = 0, className, style, tabIndex, children, ...restProps } = useDComponentConfig('menu-group', props);

  const dPrefix = useDPrefixConfig();

  //#region React.cloneElement.
  /*
   * @see https://reactjs.org/docs/react-api.html#cloneelement
   *
   * - Vue: Scoped Slots.
   * @see https://v3.vuejs.org/guide/component-slots.html#scoped-slots
   * - Angular: NgTemplateOutlet.
   * @see https://angular.io/api/common/NgTemplateOutlet
   */
  const childs = useMemo(() => {
    return generateChildren(children, true).map((child) => {
      return React.cloneElement(child, {
        ...child.props,
        __level: __level + 1,
      });
    });
  }, [__level, children]);
  //#endregion

  return (
    <>
      <div
        {...restProps}
        className={getClassName(className, `${dPrefix}menu-group`)}
        style={{ ...style, paddingLeft: 16 + __level * 20 }}
        tabIndex={isUndefined(tabIndex) ? -1 : tabIndex}
      >
        {dTitle}
      </div>
      {childs}
    </>
  );
}
