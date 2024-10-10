import { useCallback, useState } from 'react';

export const FormTab = Object.freeze({
  ReqDet: 'panelReqDet',
  CompDet: 'panelCompDet',
  Addr: 'panelAddr',
  AddrNPWP: 'panelAddrnpwp',
  AddrsSPPKP: 'panelAddrssppkp',
  Tax: 'panelTax',
  Bank: 'panelBank',
  File: 'panelFile',
  VenDetail: 'panelVendetail',
  Approval: 'panelApproval',
  CompOrg: 'panelCompOrg',
  InfoAcc: 'panelInfoAcc',
  RejectLog: 'panelRejectLog',
  OpenForm: 'openForm',
  RestrictForm: 'restrictForm',
});

export default function useTogglePanel() {
  const [panelReqDet, setpanelReqDet] = useState(true);
  const [panelCompDet, setpanelCompDet] = useState(true);
  const [panelAddr, setpanelAddr] = useState(true);
  const [panelAddrnpwp, setpanelAddrnpwp] = useState(true);
  const [panelAddrsppkp, setpanelAddrsppkp] = useState(true);
  const [panelTax, setpanelTax] = useState(true);
  const [panelBank, setpanelBank] = useState(true);
  const [panelFile, setpanelFile] = useState(true);
  const [panelVendetail, setpanelVendetail] = useState(true);
  const [panelApproval, setpanelApproval] = useState(true);
  const [panelRejectLog, setpanelRejectLog] = useState(false);
  const [panelInfoAcc, setpanelInfoAcc] = useState(true);
  const [panelCompOrg, setpanelCompOrg] = useState(true);

  const toggle = useCallback(({ type }) => {
    switch (type) {
      case 'panelReqDet':
        setpanelReqDet((prev) => !prev);
        break;
      case 'panelCompDet':
        setpanelCompDet((prev) => !prev);
        break;
      case 'panelAddr':
        setpanelAddr((prev) => !prev);
        break;
      case 'panelAddrnpwp':
        setpanelAddrnpwp((prev) => !prev);
        break;
      case 'panelAddrsppkp':
        setpanelAddrsppkp((prev) => !prev);
        break;
      case 'panelTax':
        setpanelTax((prev) => !prev);
        break;
      case 'panelBank':
        setpanelBank((prev) => !prev);
        break;
      case 'panelFile':
        setpanelFile((prev) => !prev);
        break;
      case 'panelVenDetail':
        setpanelVendetail((prev) => !prev);
        break;
      case 'panelCompOrg':
        setpanelCompOrg((prev) => !prev);
        break;
      case 'panelInfoAcc':
        setpanelInfoAcc((prev) => !prev);
        break;
      case 'panelRejectLog':
        setpanelRejectLog((prev) => !prev);
        break;
      case 'restrictForm':
        setpanelReqDet(true);
        setpanelCompDet(true);
        setpanelAddr(false);
        setpanelAddrnpwp(false);
        setpanelAddrsppkp(false);
        setpanelTax(false);
        setpanelBank(false);
        setpanelFile(false);
        setpanelVendetail(false);
        setpanelApproval(false);
        setpanelCompOrg(false);
        setpanelInfoAcc(false);
        setpanelRejectLog(false);
        break;
      case 'openForm':
        setpanelReqDet(true);
        setpanelCompDet(true);
        setpanelAddr(true);
        setpanelAddrnpwp(true);
        setpanelAddrsppkp(true);
        setpanelTax(true);
        setpanelBank(true);
        setpanelFile(true);
        setpanelVendetail(true);
        setpanelApproval(true);
        setpanelCompOrg(true);
        setpanelInfoAcc(true);
        setpanelRejectLog(false);
        break;
    }
  }, []);
  return {
    expanded: {
      panelReqDet,
      panelCompDet,
      panelAddr,
      panelAddrnpwp,
      panelAddrsppkp,
      panelTax,
      panelBank,
      panelFile,
      panelVendetail,
      panelApproval,
      panelRejectLog,
      panelInfoAcc,
      panelCompOrg,
    },
    toggle,
  };
}
