import React from 'react';

import { getComponentName, KEY_PREFIX } from '../../utils';

function isSubOrItem(component: React.ReactElement) {
  return getComponentName(component) === 'DMenuSub' || getComponentName(component) === 'DMenuItem';
}

export function generateChildren(children: React.ReactNode, adjustIndicator = false) {
  const _children = React.Children.toArray(children) as React.ReactElement[];
  return _children.map((child, index) => {
    const _child = child;
    let className = '';
    if (_children.length > 1) {
      if (index === 0 && isSubOrItem(_children[1])) {
        className = 'is-first';
      }
      if (index === _children.length - 1 && isSubOrItem(_children[_children.length - 2])) {
        className = 'is-last';
      }
    }

    return React.cloneElement(_child, {
      ..._child.props,
      className: adjustIndicator ? (_child.props.className ?? '' ? ` ${className}` : className) : _child.props.className,
      __id: isSubOrItem(_child) ? (_child.key as string).slice(KEY_PREFIX.length) : undefined,
    });
  });
}
