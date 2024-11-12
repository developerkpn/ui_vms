import { useState } from 'react';

export default function useToggleAccordion() {
  const [openAcc, setOpenAcc] = useState(false);
  const toggleAccordion = () => {
    setOpenAcc((prev) => !prev);
  };

  return { openAcc, toggleAccordion };
}
