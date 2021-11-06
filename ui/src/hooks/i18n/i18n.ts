import React, { useCallback, useContext } from 'react';

import resources from './resources.json';

export const DI18NContext = React.createContext<'en-US' | 'zh-Hant'>('en-US');

export function useTranslation() {
  const dI18N = useContext(DI18NContext);
  const t = useCallback(
    (component: string, key: string) => {
      return resources[component][key][dI18N];
    },
    [dI18N]
  );

  return [t, dI18N] as const;
}
