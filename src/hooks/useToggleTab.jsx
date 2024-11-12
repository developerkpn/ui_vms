import { useState, useMemo } from 'react';

export default function useToggleTab({ init, listtab }) {
  const listTab = useMemo(() => listtab, []);
  const [tabState, setTabState] = useState(init);
  const handleChange = (e, newValue) => {
    console.log(newValue);
    setTabState(newValue);
  };
  return { tabState, handleChange, listTab };
}
