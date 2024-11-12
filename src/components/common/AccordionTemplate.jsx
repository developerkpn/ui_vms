import useToggleAccordion from 'src/hooks/useToggleAccordion';
import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material';

import React from 'react';

export default function AccordionTemplate({ head, children, sxHead }) {
  const { openAcc, toggleAccordion } = useToggleAccordion();
  console.log(children);
  return (
    <Accordion
      expanded={openAcc}
      onChange={(e) => {
        toggleAccordion();
      }}
    >
      <AccordionSummary sx={sxHead}>{head}</AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
}
