import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Container,
  Grid,
  Typography,
  Box,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  Backdrop,
  Dialog,
  Link,
  DialogTitle,
  DialogActions,
  AlertTitle,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useGridApiRef } from '@mui/x-data-grid';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import UploadButton from 'src/components/common/UploadButton';
import { useLoaderData, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useSession } from 'src/provider/sessionProvider';
import { TextFieldComp } from 'src/components/common/TextFieldComp';
import SelectComp from 'src/components/common/SelectComp';
import CheckboxComp from 'src/components/common/CheckboxComp';
import NumericFieldComp from 'src/components/common/NumericFieldComp';
import { useForm, useFormState, useFieldArray } from 'react-hook-form';
import useAxiosPrivate from 'src/hooks/useAxiosPrivate';
import PatternFieldComp from 'src/components/common/PatternFieldComp';
import AutoCompleteSelect from 'src/components/common/AutoCompleteSelect';
import { LoadingButton } from '@mui/lab';
import ConfirmComponent from 'src/components/common/ConfirmComponent';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import AutoSelectPurOrg from 'src/components/common/AutoSelectPurOrg';
import { v4 } from 'uuid';

import RejectLog from 'src/components/common/RejectLog';
import VenBankTableRefactor from 'src/components/FormVendor/VenBankTableRefactor';

const ventypeList = {
  '3RD_PARTY': [
    { value: 'MATERIAL', label: 'Material' },
    { value: 'CONTRACTOR', label: 'Contractor' },
    { value: 'INSURANCE', label: 'Insurance' },
    { value: 'ONE_TIME', label: 'One Time' },
    { value: 'TRANSPORTER', label: 'Transporter' },
    { value: 'OTHER', label: 'Other' },
  ],
  INTERCO: [
    { value: 'MATERIAL', label: 'Material' },
    { value: 'CONTRACTOR', label: 'Contractor' },
    { value: 'INSURANCE', label: 'Insurance' },
    { value: 'TRANSPORTER', label: 'Transporter' },
  ],
  // RELATED: [
  //   { value: 'MATERIAL', label: 'Material' },
  //   { value: 'CONTRACTOR', label: 'Contractor' },
  //   { value: 'INSURANCE', label: 'Insurance' },
  //   { value: 'OTHER', label: 'Other' },
  //   { value: 'TRANSPORTER', label: 'Transporter' },
  // ],
  BANK: [{ value: 'X', label: 'X' }],
  SHAREHOLDERS: [{ value: 'X', label: 'X' }],
  // EMPLOYEE: [{ value: 'X', label: 'X' }],
  // INTERDIVISION: [{ value: 'X', label: 'X' }],
};

function RefactorFormVendorPage() {
  const theme = useTheme();
  const apiRef = useGridApiRef();
  const predata = useLoaderData();
  const axiosPrivate = useAxiosPrivate();
  const defaultValue = {
    emailRequestor: '',
    deptRequestor: '',
    titlecomp: '',
    localovs: '',
    name1: '',
    country: '',
    street: '',
    street2: '',
    street3: '',
    street4: '',
    postal: '',
    city: '',
    telf: '',
    fax: '',
    email: '',
    street_npwp: '',
    street2_npwp: '',
    street3_npwp: '',
    street4_npwp: '',
    postal_npwp: '',
    city_npwp: '',
    street_sppkp: '',
    street2_sppkp: '',
    street3_sppkp: '',
    street4_sppkp: '',
    postal_sppkp: '',
    city_sppkp: '',
    ispkp: false,
    npwp: '',
    paymthd: '',
    payterm: '',
    company: '',
    purchorg: null,
    vengroup: '',
    venacc: '',
    ventype: '',
    currency: '',
    description: '',
    is_tender: false,
    is_priority: false,
    vendorcode: '',
    remarks_readOnly: '',
    limit: '',
    search_term: '',
    website_url: '',
    ig_link: '',
    fb_link: '',
    twt_link: '',
    nama_direktur: '',
    nama_pic: '',
    no_telf_pic: '',
    email_pic: '',
    email_fin: '',
    file_atth: {},
    bank: [],
  };

  const {
    register,
    unregister,
    handleSubmit,
    control,
    getValues,
    reset,
    resetField,
    setFocus,
    setValue,
    watch,
    formState: { errors, isSubmitting, isValid },
    clearErrors,
  } = useForm({ defaultValues: defaultValue, mode: 'onChange' });

  const { fields, append, remove } = useFieldArray({
    control: control,
    name: 'bank',
    rules: { required: true },
  });

  const { handleSubmit: handleSubmit1, control: control1 } = useForm({
    defaultValues: {
      remarks: '',
    },
  });

  const { dirtyFields } = useFormState({ control: control });

  const [loader_data, setLoaderdata] = useState({
    ticket_id: '',
    ticket_num: '',
    ticket_type: '',
    ven_id: '',
    ticketState: '',
    data: '',
    permission: '',
    cur_pos: '',
    logrej_counter: null,
  });

  useEffect(() => {
    const type = predata.type;
    const tokenform = predata.token;
    const controller = new AbortController();

    async function formLoader(token) {
      // axios.defaults.headers.common.Authorization =
      //   'Bearer ' + (Cookies.get('accessToken') === undefined ? '' : Cookies.get('accessToken'));
      const response = await axiosPrivate.get(`/ticket/form/${token}`, {
        signal: controller.signal,
      });
      const data = response.data.data;
      const { data: bankInit } = await axiosPrivate.get(
        `/vendor/bank/${data.ven_id === null ? data.ticket_ven_id : data.ven_id}`,
        { signal: controller.signal }
      );
      const resultBank = bankInit.data.data;
      const valueForm = {
        emailRequestor: data.email_proc ? data.email_proc : '',
        deptRequestor: data.dep_proc ? data.dep_proc : '',
        titlecomp: data.title ? data.title : '',
        localovs: data.local_ovs ? data.local_ovs : '',
        name1: data['name_1'] ? data['name_1'] : '',
        country: data.country ? data.country : '',
        street: data.street ? data.street : '',
        street2: data.street2 ? data.street2 : '',
        street3: data.street3 ?? '',
        street4: data.street4 ?? '',
        postal: data.postal ? data.postal : '',
        city: data.city ? data.city : '',
        street_sppkp: data.street_sppkp ?? '',
        street2_sppkp: data.street2_sppkp ?? '',
        street3_sppkp: data.street3_sppkp ?? '',
        street4_sppkp: data.street4_sppkp ?? '',
        postal_sppkp: data.postal_sppkp ?? '',
        city_sppkp: data.city_sppkp ?? '',
        street_npwp: data.street_npwp ?? '',
        street2_npwp: data.street2_npwp ?? '',
        street3_npwp: data.street3_npwp ?? '',
        street4_npwp: data.street4_npwp ?? '',
        postal_npwp: data.postal_npwp ?? '',
        city_npwp: data.city_npwp ?? '',
        telf: data.telf1 ? data.telf1 : '',
        fax: data.fax ? data.fax : '',
        email: data.email ? data.email : '',
        ispkp: data.is_pkp ? data.is_pkp : false,
        npwp: data.npwp ? data.npwp : '',
        paymthd: data.pay_mthd ? data.pay_mthd : '',
        payterm: data.pay_term ? data.pay_term : 'I30',
        company: data.company ? data.company : '',
        purchorg: data.purch_org ? { value: data.purch_org, label: data.purch_org } : null,
        vengroup: data.ven_group ? data.ven_group : '',
        venacc: data.ven_acc ? data.ven_acc : '',
        ventype: data.ven_type ? data.ven_type : '',
        currency: data.lim_curr ? data.lim_curr : '',
        description: data.description ? data.description : '',
        is_tender: data.is_tender ? data.is_tender : false,
        is_priority: data.is_priority ? data.is_priority : false,
        vendorcode: data.ven_code ? data.ven_code : data.header,
        remarks_readOnly: data.remarks ? data.remarks : '',
        remarks: '',
        limit: data.limit_vendor ? data.limit_vendor : '',
        reject_by: data.reject_by ? data.reject_by : '',
        search_term: data.search_term ? data.search_term : '',
        is_active: data.ticket_stat,
        website_url: data.website_url ?? '',
        ig_link: data.ig_link ?? '',
        fb_link: data.fb_link ?? '',
        twt_link: data.twt_link ?? '',
        nama_direktur: data.nama_direktur ?? '',
        nama_pic: data.nama_pic ?? '',
        no_telf_pic: data.no_telf_pic ?? '',
        email_pic: data.email_pic ?? '',
        email_fin: data.email_fin ?? '',
        bank: resultBank.map((item) => ({
          id: item.id,
          bank_country: { value: item.country, label: item.country },
          bank_id: item.bank_id
            ? {
                value: item.bank_id,
                label: `${item.bank_name} (${item.bank_code})${item.source === 'form' ? ' - (new)' : ''}`,
              }
            : null,
          bank_curr: item.bank_curr ? { value: item.bank_curr, label: item.bank_curr } : null,
          bank_acc: item.bank_acc,
          acc_hold: item.acc_hold,
          account_statement_letter: item.account_statement_letter && {
            file_name: item.account_statement_letter,
            file_id: item.account_statement_letter_id,
          },
          passbook: item.passbook && { file_name: item.passbook, file_id: item.passbook_id },
        })),
        bunit: data.bunit,
      };

      if (valueForm.name1 === '') {
        setCheckex(true);
        setExpanded({
          panelReqDet: true,
          panelCompDet: true,
          panelAddr: false,
          panelAddrnpwp: false,
          panelAddrsppkp: false,
          panelTax: false,
          panelBank: false,
          panelFile: false,
          panelVendetail: false,
          panelApproval: false,
          panelCompOrg: false,
          panelInfoAcc: false,
          panelRejectLog: false,
        });
      } else {
        setCheckex(false);
        setExpanded({
          panelReqDet: true,
          panelCompDet: true,
          panelAddr: true,
          panelAddrnpwp: true,
          panelAddrsppkp: true,
          panelTax: true,
          panelBank: true,
          panelFile: true,
          panelVendetail: true,
          panelApproval: true,
          panelCompOrg: true,
          panelInfoAcc: true,
          panelRejectLog: false,
        });
      }

      setLoaderdata({
        ticket_id: data.ticket_id,
        ticket_num: data.ticket_num,
        ven_id: data.ven_id === null ? data.ticket_ven_id : data.ven_id,
        ticketState: data.ticket_state,
        ticket_type: data.t_type,
        data: valueForm,
        cur_pos: data.cur_pos,
        logrej_counter: data.counter,
      });
    }

    async function newformLoader(token) {
      const response = await axiosPrivate.get(`/ticket/newform/${token}`, {
        signal: controller.signal,
      });
      setExpanded({
        panelReqDet: true,
        panelCompDet: true,
        panelAddr: true,
        panelTax: true,
        panelBank: true,
        panelFile: true,
        panelVendetail: true,
        panelApproval: true,
        panelCompOrg: true,
        panelInfoAcc: true,
        panelRejectLog: false,
      });
      const data = response.data.data;
      const { data: bankInit } = await axiosPrivate.get(
        `/vendor/bank/${data.ven_id === null ? data.ticket_ven_id : data.ven_id}`,
        { signal: controller.signal }
      );
      const resultBank = bankInit.data.data;
      const valueForm = {
        emailRequestor: data.email_proc ? data.email_proc : '',
        deptRequestor: data.dep_proc ? data.dep_proc : '',
        titlecomp: data.title ? data.title : '',
        localovs: data.local_ovs ? data.local_ovs : '',
        name1: data['name_1'] ? data['name_1'] : '',
        country: data.country ? data.country : '',
        street: data.street ? data.street : '',
        street2: data.street2 ? data.street2 : '',
        street3: data.street3 ?? '',
        street4: data.street4 ?? '',
        postal: data.postal ? data.postal : '',
        city: data.city ? data.city : '',
        street_sppkp: data.street_sppkp ?? '',
        street2_sppkp: data.street2_sppkp ?? '',
        street3_sppkp: data.street3_sppkp ?? '',
        street4_sppkp: data.street4_sppkp ?? '',
        postal_sppkp: data.postal_sppkp ?? '',
        city_sppkp: data.city_sppkp ?? '',
        street_npwp: data.street_npwp ?? '',
        street2_npwp: data.street2_npwp ?? '',
        street3_npwp: data.street3_npwp ?? '',
        street4_npwp: data.street4_npwp ?? '',
        postal_npwp: data.postal_npwp ?? '',
        city_npwp: data.city_npwp ?? '',
        telf: data.telf1 ? data.telf1 : '',
        fax: data.fax ? data.fax : '',
        email: data.email ? data.email : '',
        ispkp: data.is_pkp ? data.is_pkp : false,
        npwp: data.npwp ? data.npwp : '',
        paymthd: data.pay_mthd ? data.pay_mthd : '',
        payterm: data.pay_term ? data.pay_term : 'I30',
        company: data.company ? data.company : '',
        purchorg: data.purch_org ? { value: data.purch_org, label: data.purch_org } : null,
        vengroup: data.ven_group ? data.ven_group : '',
        venacc: data.ven_acc ? data.ven_acc : '',
        ventype: data.ven_type ? data.ven_type : '',
        currency: data.lim_curr ? data.lim_curr : '',
        description: data.description ? data.description : '',
        is_tender: data.is_tender ? data.is_tender : false,
        is_priority: data.is_priority ? data.is_priority : false,
        vendorcode: data.ven_code ? data.ven_code : data.header,
        remarks_readOnly: data.remarks ? data.remarks : '',
        remarks: '',
        limit: data.limit_vendor ? data.limit_vendor : '',
        reject_by: data.reject_by ? data.reject_by : '',
        is_active: data.ticket_stat,
        search_term: data.search_term ? data.search_term : '',
        website_url: data.website_url ?? '',
        ig_link: data.ig_link ?? '',
        fb_link: data.fb_link ?? '',
        twt_link: data.twt_link ?? '',
        nama_direktur: data.nama_direktur ?? '',
        nama_pic: data.nama_pic ?? '',
        no_telf_pic: data.no_telf_pic ?? '',
        email_pic: data.email_pic ?? '',
        email_fin: data.email_fin ?? '',
        bank: resultBank.map((item) => ({
          id: item.id,
          bank_country: { value: item.country, label: item.country },
          bank_id: item.bank_id ? { value: item.bank_id, label: `${item.bank_name} (${item.bank_code})` } : null,
          bank_curr: item.bank_curr ? { value: item.bank_curr, label: item.bank_curr } : null,
          bank_acc: item.bank_acc,
          acc_hold: item.acc_hold,
          account_statement_letter: item.account_statement_letter && {
            file_name: item.account_statement_letter,
            file_id: item.account_statement_letter_id,
          },
          passbook: item.passbook && { file_name: item.passbook, file_id: item.passbook_id },
        })),
        bunit: data.bunit,
      };

      const perm = {
        INIT: {
          create: false,
          read: false,
          update: true,
          delete: false,
        },
        CREA: {
          create: false,
          read: false,
          update: false,
          delete: false,
        },
        FINA: {
          create: false,
          read: false,
          update: false,
          delete: false,
        },
      };

      if (valueForm.name1 === '') {
        setCheckex(true);
        setExpanded({
          panelReqDet: true,
          panelCompDet: true,
          panelAddr: false,
          panelAddrnpwp: false,
          panelAddrsppkp: false,
          panelTax: false,
          panelBank: false,
          panelFile: false,
          panelVendetail: false,
          panelApproval: false,
          panelCompOrg: false,
          panelInfoAcc: false,
          panelRejectLog: false,
        });
      } else {
        setCheckex(false);
        setExpanded({
          panelReqDet: true,
          panelCompDet: true,
          panelAddr: true,
          panelAddrnpwp: true,
          panelAddrsppkp: true,
          panelTax: true,
          panelBank: true,
          panelFile: true,
          panelVendetail: true,
          panelCompOrg: true,
          panelInfoAcc: true,
          panelApproval: true,
          panelRejectLog: false,
        });
      }

      setLoaderdata({
        ticket_id: data.ticket_id,
        ticket_num: data.ticket_num,
        ven_id: data.ven_id === null ? data.ticket_ven_id : data.ven_id,
        ticketState: data.ticket_state,
        ticket_type: data.t_type,
        data: valueForm,
        permission: perm,
        cur_pos: data.cur_pos,
        logrej_counter: data.counter,
      });
    }

    if (type === 'form') {
      formLoader(tokenform);
    } else {
      newformLoader(tokenform);
    }
    return () => {
      controller.abort();
    };
  }, []);
  const [chgComp, setChgComp] = useState();
  const [chgCountry, setChgCty] = useState(loader_data.data?.country);
  const [chgVengrp, setVengrp] = useState(loader_data.data?.vengroup);
  const [chgVenacc, setVenacc] = useState(loader_data.data?.venacc);
  const [chgCurr, setChgCurr] = useState(loader_data.data?.currency);
  const [currentEdit, setCurrentEdit] = useState([]);
  const [phoneNumber, setPhnNum] = useState('+XX');
  const [fileType, setFileType] = useState([]);
  const [chgIsPTKP, setIsPTKP] = useState(false);
  const [chgLocal, setLocal] = useState('');
  const [compTitle, setComptitle] = useState(loader_data.data?.titlecomp);
  const [compName, setCompname] = useState();
  const [checkIsExist, setCheckex] = useState(true);
  const [openAlert, setOpenAlert] = useState(false);
  const [isTender, setTender] = useState(loader_data.data?.is_tender);
  const [btnClicked, setBtnclick] = useState(false);
  const [modalRejectopen, setModalopen] = useState(false);
  const [modalConfirmopen, setConfOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(false);
  const [loadAddBank, setLoadAddBnk] = useState(false);
  const [langCode, setLang] = useState('id');
  const { t, i18n } = useTranslation('translation', { lng: langCode });
  const [initDataFile, setInitDfile] = useState([]);
  // const updateCurrentEdit = (rows) => {
  //   setCurrentEdit(rows);
  // };
  const funChgCountry = useCallback((item) => {
    setChgCty(item);
    countrycode.current = item;
  }, []);
  const funChgVgrp = useCallback((item) => {
    setVengrp(item);
  }, []);
  const funChgVacc = useCallback((item) => {
    setVenacc(item);
    if (item !== 'TRADE') {
      clearErrors('currency');
      clearErrors('limit');
    }
  }, []);
  const funChgIsPTKP = useCallback((item) => {
    setIsPTKP(item);
  }, []);
  const funChgComp = useCallback((item) => {
    setChgComp(item);
    resetField('purchorg');
  }, []);

  const sameWithAddrComp = useCallback((fields) => {
    const country = getValues(`country`);
    const street = getValues(`street`);
    const street2 = getValues(`street2`);
    const street3 = getValues(`street3`);
    const street4 = getValues(`street4`);
    const postal = getValues(`postal`);
    const city = getValues(`city`);

    setValue(`country_${fields}`, country);
    setValue(`street_${fields}`, street);
    setValue(`street2_${fields}`, street2);
    setValue(`street3_${fields}`, street3);
    setValue(`street4_${fields}`, street4);
    setValue(`postal_${fields}`, postal);
    setValue(`city_${fields}`, city);
  }, []);

  const checkExist = useCallback(async (item) => {
    setLoadex(true);
    try {
      const checkExt = await axiosPrivate.get(`/vendor/checkven?name=${item}`);
      // console.log(checkExt);
      setCheckex(false);
      // console.log(expanded);
      setExpanded({
        panelReqDet: true,
        panelCompDet: true,
        panelAddr: true,
        panelAddrnpwp: true,
        panelAddrsppkp: true,
        panelTax: true,
        panelBank: true,
        panelFile: true,
        panelVendetail: true,
        panelApproval: true,
        panelCompOrg: true,
        panelInfoAcc: true,
        panelRejectLog: false,
      });
      setLoadex(false);
      setBtnclick(false);
    } catch (error) {
      console.log(error);
      setOpenAlert(true);
      setExpanded({
        panelReqDet: true,
        panelCompDet: true,
        panelAddr: false,
        panelAddrnpwp: false,
        panelAddrsppkp: false,
        panelTax: false,
        panelBank: false,
        panelFile: false,
        panelVendetail: false,
        panelApproval: false,
        panelCompOrg: false,
        panelInfoAcc: false,
        panelRejectLog: false,
      });
      setLoadex(false);
    }
  }, []);

  const funChgCurr = useCallback((item) => {
    setChgCurr(item);
  }, []);

  const funChgLoc = useCallback((item) => {
    if (item === 'LOCAL') {
      setChgCty('ID');
      setValue('country', 'ID');
    }
    setLocal(item);
  }, []);

  const funChgTdr = useCallback((item) => {
    onLoad.current = true;
    setTender(item);
    if (!item) {
      clearErrors('description');
    }
  }, []);

  const funChgTitle = useCallback((item) => {
    setComptitle(item);
  }, []);

  const funChgname = useCallback((item) => {
    if (item != compName && item !== '') {
      setCheckex(true);
      setExpanded({
        panelReqDet: true,
        panelCompDet: true,
        panelAddr: false,
        panelTax: false,
        panelBank: false,
        panelFile: false,
        panelVendetail: false,
        panelApproval: false,
        panelRejectLog: false,
        panelAddrnpwp: false,
        panelAddrsppkp: false,
        panelCompOrg: false,
        panelInfoAcc: false,
      });
      setBtnclick(true);
      setCompname(item);
    } else if (item == compName && item !== '') {
      setCheckex(false);
      setExpanded({
        panelReqDet: true,
        panelCompDet: true,
        panelAddr: true,
        panelTax: true,
        panelBank: true,
        panelFile: true,
        panelVendetail: true,
        panelApproval: true,
        panelRejectLog: false,
        panelAddrnpwp: true,
        panelAddrsppkp: true,
        panelCompOrg: true,
        panelInfoAcc: true,
      });
      setBtnclick(false);
    } else {
      setCheckex(true);
      setExpanded({
        panelReqDet: true,
        panelCompDet: true,
        panelAddr: false,
        panelTax: false,
        panelBank: false,
        panelFile: false,
        panelVendetail: false,
        panelApproval: false,
        panelRejectLog: false,
        panelAddrnpwp: false,
        panelAddrsppkp: false,
        panelCompOrg: false,
        panelInfoAcc: false,
      });
      setBtnclick(true);
      setCompname(item);
    }
  }, []);

  const modalRejectclose = useCallback(() => {
    setModalopen(false);
  }, []);

  const modalConfclose = useCallback(() => {
    setConfOpen(false);
  }, []);

  const confirmActionFun = useCallback(() => {
    setConfirmAction(true);
  }, []);

  useEffect(() => {
    // console.log(loader_data);
    reset(loader_data.data);
    setChgCty(loader_data.data?.country);
    setVengrp(loader_data.data?.vengroup);
    setVenacc(loader_data.data?.venacc);
    setChgCurr(loader_data.data?.currency);
    setTender(loader_data.data?.is_tender);
    setComptitle(loader_data.data?.titlecomp);
    setCompname(loader_data.data?.name1);
    setLocal(loader_data.data?.localovs);
    setIsPTKP(loader_data.data?.ispkp);
  }, [loader_data]);

  useEffect(() => {
    const controller = new AbortController();
    if (compTitle !== '' && chgLocal !== '' && compTitle && chgLocal) {
      (async () => {
        try {
          unregister('file_atth');
          const { data } = await axiosPrivate.get(
            `/master/filetype?title=${compTitle}&localovs=${chgLocal}&curpos=${ticketState}`,
            {
              signal: controller.signal,
            }
          );
          data.forEach((item) => {
            if (isTender && item.file_code == 'A010') {
              register(`file_atth.${item.file_code}`, {
                required: item.file_type,
              });
            } else {
              register(
                `file_atth.${item.file_code}`,
                item.is_mandatory && {
                  required: item.file_type,
                }
              );
            }
            const fileInit = initDataFile
              .filter((element) => element.file_type === item.file_code)
              .map((item) => item.file_name);
            if (fileInit) {
              setValue(`file_atth.${item.file_code}`, fileInit[0]);
            }
          });
          setFileType(
            data.map((item) => {
              if (isTender && item.file_code == 'A010') {
                return {
                  key: item.file_code,
                  value: `${t(item.file_type)} * `,
                  help: langCode === 'id' ? item.help : item.helpen,
                };
              }
              return {
                key: item.file_code,
                value: `${t(item.file_type)} ${item.is_mandatory ? '*' : ''}`,
                help: langCode === 'id' ? item.help : item.helpen,
              };
            })
          );
        } catch (error) {
          console.error(error);
        }
      })();
    }
    return () => {
      controller.abort();
    };
  }, [compTitle, langCode, chgLocal, loader_data, t, isTender, fields, initDataFile]);

  useEffect(() => {
    const firstError = Object.keys(errors).reduce((field, a) => {
      return errors[field] ? field : a;
    }, null);
    if (firstError) {
      // console.log(firstError);
      setFocus(firstError);
    }
  }, [errors, setFocus]);

  useEffect(() => {
    if (confirmAction) {
      submitForm(getValues());
      setConfOpen(false);
      setConfirmAction(false);
    }
  }, [confirmAction]);

  useEffect(() => {
    if (isTender && onLoad.current) {
      setFocus('description');
    }
  }, [isTender]);

  // useEffect(() => {
  //   console.log(i18n.language);
  //   console.log('Current language:', i18n.language);
  //   console.log('Translation for required:', t('Please insert this field'));
  //   setRequired(t('Please insert this field'));
  // }, [t, i18n.language]);

  const navigate = useNavigate();
  const { session, getPermission } = useSession();
  const ticketState = useMemo(() => loader_data?.ticketState, [loader_data]);
  const is_active = useMemo(() => loader_data.data?.is_active, [loader_data]);
  const countrycode = useRef(loader_data.data?.country);

  const UPDATE = useMemo(() => {
    let permissions = {};
    let MgrAllow = true;
    if (['MGRPRC', 'MGRDWS', 'MGRPRCDWS'].includes(loader_data.cur_pos)) {
      MgrAllow = ['MGR', 'ADMIN'].includes(session.role);
    }
    if (is_active) {
      if (loader_data.permission != undefined) {
        permissions = loader_data.permission;
      } else {
        permissions.INIT = getPermission('Initial Form');
        permissions.CREA = getPermission('Creation Form');
        permissions.FINA = getPermission('Final Form');
      }
    } else {
      permissions = {
        INIT: { create: false, read: false, update: false, delete: false },
        CREA: { create: false, read: false, update: false, delete: false },
        FINA: { create: false, read: false, update: false, delete: false },
      };
    }
    return {
      INIT: permissions.INIT.update,
      CREA: permissions.CREA.update && MgrAllow,
      FINA: permissions.FINA.update,
    };
  }, [loader_data]);

  const countries = useRef([{ value: '', label: '' }]);
  const [currencies, setCurr] = useState([]);
  const allCurr = useRef([]);
  // const cities = useRef([{ value: '', label: '' }]);
  const banks = useRef([{ value: '', label: '' }]);
  const payterm = useRef([{ value: '', label: '' }]);
  const comps = useRef([{ value: '', label: '' }]);
  const bank_valid = useRef(false);
  const file_valid = useRef(false);
  const uploadButRef = useRef(null);
  const onLoad = useRef(false);
  const [initDataBank, setInitDbank] = useState([]);

  const [cities, setCities] = useState([{ value: '', label: '' }]);
  const [loading, setLoading] = useState(false);
  const [loadingEx, setLoadex] = useState(false);
  const is_draft = useRef(false);

  const [loadingCountry, setLoadCountry] = useState(false);
  const [loadingCurr, setLoadCurr] = useState(false);
  const [loadingBanks, setLoadBanks] = useState(false);
  const [loadingInitFile, setLoadInitFile] = useState(false);
  const [loadingComp, setLoadComp] = useState(false);
  const [loadingPayterm, setLoadPayterm] = useState(false);

  const vengroups = [
    { value: '3RD_PARTY', label: '3RD Party' },
    { value: 'BANK', label: 'Bank' },
    { value: 'SHAREHOLDERS', label: 'Shareholders' },
    // { value: 'EMPLOYEE', label: 'Employee' },
    // { value: 'INTERDIVISION', label: 'Interdivision' },
    // { value: 'RELATED', label: 'Related' },
    { value: 'INTERCO', label: 'Interco' },
  ];

  const title = [
    { value: 'COMPANY', label: t('Company') },
    { value: 'PERSONAL', label: 'PERSONAL' },
  ];

  const localoverseas = [
    { value: 'LOCAL', label: t('Local') },
    {
      value: 'OVS',
      label: t('Overseas'),
    },
  ];

  const [formStat, setFormStat] = useState({
    stat: false,
    type: 'info',
    message: '',
  });
  const [ven_file, setVen_file] = useState([]);
  const [expanded, setExpanded] = useState({
    panelReqDet: true,
    panelCompDet: true,
    panelAddr: true,
    panelAddrnpwp: true,
    panelAddrsppkp: true,
    panelTax: true,
    panelBank: true,
    panelFile: true,
    panelVendetail: true,
    panelApproval: true,
    panelRejectLog: false,
    panelInfoAcc: true,
    panelCompOrg: true,
  });
  useMemo(() => ({ cities, countries, currencies }), [cities, countries, currencies]);

  const getInitDataFile = useCallback(
    async (controller) => {
      setLoadInitFile(true);
      try {
        const fileInit = await axiosPrivate.get(`/vendor/file/${loader_data.ven_id}`, { signal: controller.signal });
        const result = fileInit.data.data;
        setInitDfile(result.data);
        setLoadInitFile(false);
      } catch (err) {
        setLoadInitFile(false);
        console.error(err);
        // alert(err.stack);
      }
    },
    [loader_data]
  );

  useEffect(() => {
    const controller = new AbortController();
    const dynaCity = async () => {
      countrycode.current = loader_data.data?.country;
      try {
        const getcities = await axiosPrivate.post(
          `/master/city`,
          {
            countryId: chgCountry,
          },
          {
            signal: controller.signal,
          }
        );
        const result = getcities.data.data;
        const convcity = result.data.map((item) => ({
          value: item.city,
          label: item.city,
        }));
        setCities(convcity);
      } catch (err) {
        console.error(err);
        // alert(err.stack);
      }
    };

    const getPhoneNum = async () => {
      try {
        const { data: phoneNum } = await axiosPrivate.get('/master/phonecode?id=' + chgCountry);
        setPhnNum(`+${phoneNum.code}-################`);
      } catch (error) {
        console.error(error);
      }
    };

    if (chgCountry) {
      dynaCity();
      getPhoneNum();
    }
    return () => {
      controller.abort();
    };
  }, [chgCountry, loader_data]);

  useEffect(() => {
    if (allCurr.current.length > 0) {
      setCurr(allCurr.current.filter((item) => (chgLocal === 'LOCAL' && item.nation === 'ID') || chgLocal === 'OVS'));
    }
  }, [chgLocal, allCurr.current]);

  useEffect(() => {
    setLoading(true);
    const controller = new AbortController();
    const dynaCountry = async () => {
      setLoadCountry(true);
      try {
        const country = await axiosPrivate.post(
          `/master/country`,
          {},
          {
            signal: controller.signal,
          }
        );
        const result = country.data.data;
        countries.current = result.data.map((item) => ({
          value: item.country_code,
          label: item.country_name,
        }));
      } catch (err) {
        console.error(err);
        // alert(err.stack);
      } finally {
        setLoadCountry(false);
      }
    };

    const getCurr = async () => {
      setLoadCurr(true);
      try {
        setLoadCurr(false);
        const curr = await axiosPrivate.get(`/master/curr`, { signal: controller.signal });
        const response = curr.data;
        const result = response.data;
        setCurr(
          result.data.map((item) => ({
            value: item.code === null ? '' : item.code,
            label: item.code === null ? '' : item.code,
            nation: item.nation,
          }))
        );
        allCurr.current = result.data.map((item) => ({
          value: item.code === null ? '' : item.code,
          label: item.code === null ? '' : item.code,
          nation: item.nation,
        }));
      } catch (err) {
        setLoadCurr(false);
        console.error(err);
        // alert(err.stack);
      }
    };

    const getBanks = async () => {
      setLoadBanks(true);
      try {
        setLoadBanks(false);
        const banksData = await axiosPrivate.get(`/master/banksap`, { signal: controller.signal });
        const response = banksData.data;
        const result = response.data;
        banks.current = result;
      } catch (error) {
        setLoadBanks(false);
        console.log(error);
        // alert(error.stack);
      }
    };

    const getCompany = async () => {
      setLoadComp(true);
      try {
        const compsData = await axiosPrivate.get(`/master/company`, { signal: controller.signal });
        const response = compsData.data;
        const result = response.data;
        comps.current = result.data;
        // console.log(result.data);
        // console.log(loader_data.data);
        if (loader_data.data.bunit) {
          if (loader_data.data.bunit === 'UPS') {
            comps.current = { UPSTREAM: result.data['UPSTREAM'] };
          } else {
            comps.current = { DOWNSTREAM: result.data['DOWNSTREAM'] };
          }
        }
        setLoadComp(false);
      } catch (error) {
        setLoadComp(false);
        console.error(error);
        // alert(error.stack);
      }
    };

    const getPayterm = async () => {
      setLoadPayterm(true);
      try {
        const paytermData = await axiosPrivate.get(`/master/payterm`, { signal: controller.signal });
        const data = paytermData.data.data;
        payterm.current = data.map((item) => ({
          value: item.term_code,
          label: `${item.term_code}-${item.term_name}`,
        }));
        setLoadPayterm(false);
      } catch (error) {
        setLoadPayterm(false);
        console.error(error);
        // alert(error.stack);
      }
    };

    if (loader_data.ven_id !== '') {
      (async () => {
        setLoading(true);
        await dynaCountry();
        await getCurr();
        await getBanks();
        // await getInitDataBank(controller);
        await getInitDataFile(controller);
        await getCompany();
        await getPayterm();
        setLoading(false);
      })();
    }
    return () => {
      controller.abort();
    };
  }, [loader_data]);

  const setVen_fileFromChild = useCallback((newItem) => {
    if (newItem.length > 0) {
      newItem.forEach((item) => {
        setValue(`file_atth.${item.file_type}`, item.file_name);
      });
      setVen_file(newItem);
    }
  }, []);

  const deleteVenFile = (deletedFile) => {
    resetField(`file_atth.${deletedFile?.file_type}`);
  };

  const handleExpanded = useCallback(
    (panel) => {
      setExpanded((prev) => {
        let newExpand = {};
        Object.keys(prev).forEach((keys) => {
          if (keys === panel && !checkIsExist) {
            newExpand[panel] = !prev[keys];
          } else {
            newExpand[keys] = prev[keys];
          }
        });
        return newExpand;
      });
    },
    [expanded]
  );

  const handleSnackClose = useCallback((e, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setFormStat({ ...formStat, stat: false });
  }, []);

  const changeLang = useCallback((e, value) => {
    setLang(value);
    i18n.changeLanguage(value);
  }, []);

  const handleReject = useCallback(
    async (value) => {
      setLoading(true);
      // setTimeout(() => {
      //   setLoading(false);
      // }, 3000);
      try {
        const rejectParams = {
          ticket_id: loader_data.ticket_id,
          remarks: value.remarks,
        };
        const resultReject = await axiosPrivate.patch(`/ticket/reject`, rejectParams);
        const response = resultReject.data;
        setFormStat({ stat: true, type: 'success', message: response.message });
        setLoading(false);
        setTimeout(() => {
          navigate('../../dashboard/ticket');
        }, 2000);
      } catch (error) {
        setLoading(false);
        console.error(error);
        alert(error);
      }
    },
    [loader_data]
  );

  const handleAddNewBank = useCallback(async () => {
    setLoadAddBnk(true);
    try {
      const bankv_id = v4();
      const { data } = await axiosPrivate.post(`/vendor/newbank`, {
        bankv_id: bankv_id,
        ven_id: loader_data.ven_id,
        bank_country: chgLocal === 'LOCAL' ? 'ID' : null,
      });
      append({
        id: bankv_id,
        bank_country: chgLocal === 'LOCAL' ? { value: 'ID', label: 'Indonesia' } : null,
        bank_id: null,
        bank_curr: null,
        bank_acc: '',
        acc_hold: '',
      });
    } catch (error) {
      console.error(error);
      setFormStat({
        stat: true,
        type: 'error',
        message: error.response?.data?.message ?? error?.message,
      });
    } finally {
      setLoadAddBnk(false);
    }
  }, [chgLocal, loader_data]);

  // useEffect(() => {
  //   console.log(currentEdit);
  //   Object.keys(currentEdit).map((item) => {
  //     console.log(apiRef.current.getCellElement(item, 'action').children[0].firstElementChild.getAttribute('id'));
  //   });
  // }, [currentEdit]);

  const submitForm = async (value) => {
    // setBtnclick(true);
    const controller = new AbortController();
    const filteredVenFile = ven_file.filter((item) => item.method !== '');
    const ven_detail = {
      ven_id: loader_data.ven_id,
      ticket_num: loader_data.ticket_num,
      title: value.titlecomp,
      name_1: value.name1,
      local_ovs: value.localovs,
      postal: value.postal.trim(),
      country: value.country,
      city: typeof value.city === 'object' ? value.city.value : value.city,
      street: value.street,
      street2: value.street2,
      street3: value.street3,
      street4: value.street4,
      postal_npwp: value.postal_npwp.trim(),
      city_npwp: typeof value.city_npwp === 'object' ? value.city_npwp.value : value.city_npwp,
      street_npwp: value.street_npwp,
      street2_npwp: value.street2_npwp,
      street3_npwp: value.street3_npwp,
      street4_npwp: value.street4_npwp,
      postal_sppkp: value.postal_sppkp.trim(),
      city_sppkp: typeof value.city_sppkp === 'object' ? value.city_sppkp.value : value.city_sppkp,
      street_sppkp: value.street_sppkp,
      street2_sppkp: value.street2_sppkp,
      street3_sppkp: value.street3_sppkp,
      street4_sppkp: value.street4_sppkp,
      telf1: value.telf.trim().split(/-/)[1],
      fax: value.fax.trim().split(/-/)[1],
      email: value.email,
      is_pkp: value.ispkp,
      is_tender: value.is_tender,
      is_priority: value.is_priority,
      npwp: value.npwp.trim(),
      pay_mthd: value.paymthd,
      pay_term: value.payterm,
      company: value.company,
      purch_org: value.purchorg?.value,
      ven_acc: value.venacc,
      ven_group: value.vengroup,
      ven_type: value.ventype,
      description: value.description,
      limit_vendor: value.limit.toString().match(/\d+/g)?.join(''),
      lim_curr: value.currency,
      ven_code: loader_data.cur_pos !== 'FINA' ? '' : value.vendorcode,
      search_term: value.search_term,
      website_url: value.website_url.trim(),
      ig_link: value.ig_link.trim(),
      fb_link: value.fb_link.trim(),
      twt_link: value.twt_link.trim(),
      nama_direktur: value.nama_direktur.trim(),
      nama_pic: value.nama_pic.trim(),
      no_telf_pic: value.no_telf_pic.trim().split(/-/)[1],
      email_pic: value.email_pic.trim(),
      email_fin: value.email_fin.trim(),
    };
    let tempBanks = [];
    let ven_bank;
    if (dirtyFields.bank) {
      dirtyFields?.bank.map((item, index) => {
        let changed = false;
        Object.keys(item).map((keys) => {
          if (item[keys]?.value === true) {
            changed = true;
          } else if (item[keys] === true) {
            changed = true;
          }
        });
        if (changed) {
          let bk = value.bank[index];
          const payload = {
            ...bk,
            bank_country: bk.bank_country?.value,
            bank_curr: bk.bank_curr?.value,
            bank_id: bk.bank_id?.value,
          };
          tempBanks.push(payload);
        }
      });
      ven_bank = tempBanks.map((item) => ({
        ...item,
        method: 'update',
      }));
    } else {
      ven_bank = [];
    }

    const jsonSend = {
      role: session.role === undefined ? 'VENDOR' : session.role,
      is_draft: is_draft.current,
      ticket_id: loader_data.ticket_id,
      remarks: value.remarks,
      ticket_state: ticketState,
      ven_detail: ven_detail,
      ven_banks: ven_bank,
      ven_files: filteredVenFile,
      cur_pos: loader_data.cur_pos,
    };

    try {
      setLoading(true);
      let submit;
      if (session.role === undefined || predata.type !== 'form') {
        submit = await axios.post(`${import.meta.env.VITE_URL_LOC}/ticket/newform/submit`, jsonSend);
        // console.log('submitting...');
      } else {
        submit = await axiosPrivate.post(`/ticket/form/submit`, jsonSend);
        // console.log('submitting...');
      }
      const response = submit.data;
      setFormStat({ stat: true, type: 'success', message: response.message });
      console.log('done');
      if (!is_draft.current) {
        setTimeout(() => {
          if (UPDATE.INIT) {
            navigate(0);
          } else {
            navigate('../../dashboard/ticket');
          }
        }, 3000);
        // console.log('reloading...');
      } else {
        // getInitDataBank(controller);
        getInitDataFile(controller);
      }
    } catch (err) {
      console.log(err.stack);
      // alert(err.stack);
      setFormStat({ stat: true, type: 'error', message: 'error submitting' });
    } finally {
      setLoading(false);
      setBtnclick(false);
    }
  };

  useEffect(() => {
    resetField('limit');
    resetField('currency');
  }, [chgVenacc]);

  // useEffect(() => {
  //   if (loadingCountry) {
  //     console.log('Country loading');
  //   }
  //   if (loadingCurr) {
  //     console.log('Curr loading');
  //   }
  //   if (loadingBanks) {
  //     console.log('Banks loading');
  //   }
  //   if (loadingInitFile) {
  //     console.log('Init File loading');
  //   }
  //   if (loadingComp) {
  //     console.log('Company loading');
  //   }
  //   if (loadingPayterm) {
  //     console.log('Payterm loading');
  //   }
  //   if (loading) {
  //     console.log('loading');
  //   }
  // }, [loadingCountry, loadingCurr, loadingBanks, loadingInitFile, loadingComp, loadingPayterm, loading]);

  return (
    <>
      <Container maxWidth="xl">
        <Box sx={{ height: 120, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Typography variant="h4" gutterBottom>
            {`Form Vendor Registration ${loader_data.ticket_num}`}
          </Typography>
        </Box>
        <Container>
          <form key={1} onSubmit={handleSubmit(submitForm)}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <ToggleButtonGroup value={langCode} onChange={changeLang} exclusive>
                <ToggleButton value="id">ID</ToggleButton>
                <ToggleButton value="en">EN</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {loader_data.data?.reject_by && (
              <Alert
                severity="error"
                variant="filled"
                sx={{
                  width: '100%',
                  mt: '1rem',
                  mb: '1rem',
                  '& .MuiAlert-message': {
                    width: '96%',
                  },
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', borderBox: 'box-sizing', width: '100%' }}>
                  {t('Form Rejected')}
                  <div
                    style={{
                      color: '#158fff',
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      padding: '0.5rem 0.5rem 0.5rem 0.5rem ',
                      width: 'auto',
                      boxSizing: 'border-box',
                    }}
                  >
                    <TextField value={loader_data.data?.remarks_readOnly} multiline disabled fullWidth />
                    {/* {loader_data.data?.remarks_readOnly} */}
                  </div>
                </Box>
              </Alert>
            )}

            <Accordion
              expanded={expanded.panelReqDet}
              onChange={(e) => handleExpanded('panelReqDet')}
              TransitionProps={{ unmountOnExit: true }}
            >
              <AccordionSummary
                sx={{
                  pointerEvents: 'none',
                }}
                expandIcon={
                  <ExpandMoreIcon
                    sx={{
                      pointerEvents: 'auto',
                    }}
                  />
                }
                id="panelReqDet"
              >
                <Typography>{t('Requestor')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs>
                    <TextFieldComp
                      name="emailRequestor"
                      label={t('Email Requestor')}
                      control={control}
                      disabled={true}
                    />
                  </Grid>
                  <Grid item xs>
                    <TextFieldComp name="deptRequestor" label={t('Departement')} control={control} disabled={true} />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
            <Accordion
              expanded={expanded.panelCompDet}
              onChange={(e) => handleExpanded('panelCompDet')}
              TransitionProps={{ unmountOnExit: true }}
            >
              <AccordionSummary
                sx={{
                  pointerEvents: 'none',
                }}
                expandIcon={
                  <ExpandMoreIcon
                    sx={{
                      pointerEvents: 'auto',
                    }}
                  />
                }
                id="panelCompDet"
              >
                <Typography>{t('Company Details')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={3}>
                    <SelectComp
                      name="titlecomp"
                      label={t('Title') + ' *'}
                      control={control}
                      t={t}
                      disabled={
                        !(
                          (UPDATE.INIT && ticketState === 'INIT') ||
                          (UPDATE.CREA && ticketState === 'CREA' && loader_data.ticket_type === 'PROC')
                        )
                      }
                      onChangeovr={funChgTitle}
                      options={title}
                      rules={{ required: 'Please insert this field' }}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <SelectComp
                      name="localovs"
                      label={t('Local/Overseas') + ' *'}
                      t={t}
                      control={control}
                      disabled={
                        !(
                          (UPDATE.INIT && ticketState === 'INIT') ||
                          (UPDATE.CREA && ticketState === 'CREA' && loader_data.ticket_type === 'PROC')
                        )
                      }
                      options={localoverseas}
                      rules={{ required: 'Please insert this field' }}
                      onChangeovr={funChgLoc}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <SelectComp
                      name="country"
                      label={t('Country') + ' *'}
                      t={t}
                      control={control}
                      disabled={
                        !(
                          (UPDATE.INIT && ticketState === 'INIT') ||
                          (UPDATE.CREA && ticketState === 'CREA' && loader_data.ticket_type === 'PROC')
                        ) || chgLocal === 'LOCAL'
                      }
                      options={countries.current}
                      onChangeovr={funChgCountry}
                      rules={{
                        required: 'Please insert this field',
                      }}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextFieldComp
                      name="name1"
                      label={t('Company Name') + ' *'}
                      control={control}
                      disabled={
                        !(
                          (UPDATE.INIT && ticketState === 'INIT') ||
                          (UPDATE.CREA && ticketState === 'CREA' && loader_data.ticket_type === 'PROC')
                        )
                      }
                      t={t}
                      rules={{
                        required: 'Please insert this field',
                        maxLength: { value: 300, message: 'Max 300 Character' },
                      }}
                      onChangeovr={funChgname}
                      toUpperCase={true}
                    />
                  </Grid>
                  {checkIsExist && (
                    <>
                      <Grid item xs={2}>
                        <LoadingButton
                          onClick={() => checkExist(getValues('name1'))}
                          sx={{ width: '4rem', height: '3.5rem' }}
                          loading={loadingEx}
                        >
                          {t('Verify')}
                        </LoadingButton>
                      </Grid>
                      <Grid item xs={4}>
                        <Alert variant="filled" severity="warning">
                          {t('Untuk melanjutkan, mohon klik verifikasi apakah nama vendor yang diisi sudah terdaftar')}
                        </Alert>
                      </Grid>
                    </>
                  )}
                  {!checkIsExist && <Grid item xs={6}></Grid>}

                  <Grid item xs={3}>
                    <PatternFieldComp
                      name="telf"
                      label={t('Telephone Number')}
                      useplaceholder
                      control={control}
                      disabled={!((UPDATE.INIT && ticketState === 'INIT') || (UPDATE.CREA && ticketState === 'CREA'))}
                      format={phoneNumber}
                      isNumString={false}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <PatternFieldComp
                      name="fax"
                      label={t('Handphone Number')}
                      useplaceholder
                      control={control}
                      disabled={!((UPDATE.INIT && ticketState === 'INIT') || (UPDATE.CREA && ticketState === 'CREA'))}
                      format={phoneNumber}
                      isNumString={false}
                      tooltip={t('Gunakan format kode telfon internasional')}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextFieldComp
                      name="email"
                      label="Email *"
                      control={control}
                      t={t}
                      disabled={!((UPDATE.INIT && ticketState === 'INIT') || (UPDATE.CREA && ticketState === 'CREA'))}
                      rules={{
                        required: 'Please insert this field',
                        pattern: {
                          value: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g,
                          message: 'invalid email address',
                        },
                      }}
                      toLowerCase={true}
                      tooltip={t('Diisikan email perusahaan atau email pribadi jika vendor perorangan')}
                    />
                  </Grid>

                  {((ticketState === 'FINA' && UPDATE[ticketState]) || ticketState === 'END') && (
                    <Grid item xs={6}>
                      <TextFieldComp
                        name="search_term"
                        label={t('Search Term') + ' *'}
                        control={control}
                        disabled={!(UPDATE.FINA && ticketState === 'FINA')}
                        t={t}
                        rules={{
                          required: 'Please insert this field',
                          maxLength: { value: 100, message: 'Max 100 Character' },
                        }}
                        toUpperCase={true}
                        tooltip={t('Akronim atau istilah pencarian yang akan digunakan di SAP')}
                      />
                    </Grid>
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>
            {checkIsExist && openAlert && (
              <Alert sx={{ mt: '2rem', mb: '2rem' }} severity="error" variant="filled">
                {t('Already Exist')}
              </Alert>
            )}
            <Accordion
              expanded={expanded.panelInfoAcc}
              onChange={(e) => handleExpanded('panelInfoAcc')}
              TransitionProps={{ unmountOnExit: true }}
            >
              <AccordionSummary
                sx={{
                  pointerEvents: 'none',
                }}
                expandIcon={
                  <ExpandMoreIcon
                    sx={{
                      pointerEvents: 'auto',
                    }}
                  />
                }
                id="panelCompDet"
              >
                <Typography>{t('Website and Social Media Vendor Information')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextFieldComp
                      name="website_url"
                      t={t}
                      label={t('URL Website')}
                      control={control}
                      disabled={!((UPDATE.INIT && ticketState === 'INIT') || (UPDATE.CREA && ticketState === 'CREA'))}
                      rules={{ maxLength: { value: 500, message: 'Max 500 Character' } }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextFieldComp
                      name="ig_link"
                      t={t}
                      label={t('Instagram')}
                      control={control}
                      disabled={!((UPDATE.INIT && ticketState === 'INIT') || (UPDATE.CREA && ticketState === 'CREA'))}
                      rules={{ maxLength: { value: 500, message: 'Max 500 Character' } }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextFieldComp
                      name="fb_link"
                      t={t}
                      label={t('Facebook')}
                      control={control}
                      disabled={!((UPDATE.INIT && ticketState === 'INIT') || (UPDATE.CREA && ticketState === 'CREA'))}
                      rules={{ maxLength: { value: 500, message: 'Max 500 Character' } }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextFieldComp
                      name="twt_link"
                      t={t}
                      label={t('Twitter')}
                      control={control}
                      disabled={!((UPDATE.INIT && ticketState === 'INIT') || (UPDATE.CREA && ticketState === 'CREA'))}
                      rules={{ maxLength: { value: 500, message: 'Max 500 Character' } }}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
            <Accordion
              expanded={expanded.panelCompOrg}
              onChange={(e) => handleExpanded('panelCompOrg')}
              TransitionProps={{ unmountOnExit: true }}
            >
              <AccordionSummary
                sx={{
                  pointerEvents: 'none',
                }}
                expandIcon={
                  <ExpandMoreIcon
                    sx={{
                      pointerEvents: 'auto',
                    }}
                  />
                }
                id="panelCompDet"
              >
                <Typography>{t('Company Organization')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextFieldComp
                      name="nama_direktur"
                      t={t}
                      label={t('Director Name') + ' *'}
                      control={control}
                      disabled={!((UPDATE.INIT && ticketState === 'INIT') || (UPDATE.CREA && ticketState === 'CREA'))}
                      toUpperCase={true}
                      rules={{
                        required: 'Please insert this field',
                        maxLength: { value: 300, message: 'Max 300 Character' },
                      }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextFieldComp
                      name="nama_pic"
                      t={t}
                      label={t('PIC Name') + ' *'}
                      control={control}
                      disabled={!((UPDATE.INIT && ticketState === 'INIT') || (UPDATE.CREA && ticketState === 'CREA'))}
                      toUpperCase={true}
                      rules={{
                        required: 'Please insert this field',
                        maxLength: { value: 300, message: 'Max 300 Character' },
                      }}
                      tooltip={t('Nama dari pihak vendor yang mengisi form')}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <PatternFieldComp
                      name="no_telf_pic"
                      label={t('Handphone Number PIC')}
                      useplaceholder
                      control={control}
                      disabled={!((UPDATE.INIT && ticketState === 'INIT') || (UPDATE.CREA && ticketState === 'CREA'))}
                      format={phoneNumber}
                      isNumString={false}
                      rules={{ required: 'Please insert this field' }}
                      tooltip={
                        t('Nomor handphone pihak vendor yang berhubungan dengan KPN') +
                        '. ' +
                        t('Gunakan format kode telfon internasional')
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextFieldComp
                      name="email_pic"
                      t={t}
                      label={t('Email PIC') + ' *'}
                      control={control}
                      disabled={!((UPDATE.INIT && ticketState === 'INIT') || (UPDATE.CREA && ticketState === 'CREA'))}
                      toLowerCase={true}
                      rules={{
                        required: 'Please insert this field',
                        pattern: {
                          value: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g,
                          message: 'invalid email address',
                        },
                        maxLength: { value: 500, message: 'Max 500 Character' },
                      }}
                      tooltip={t('Alamat email pihak vendor yang berhubungan dengan KPN')}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextFieldComp
                      name="email_fin"
                      t={t}
                      label={t('Email Finance') + ' *'}
                      control={control}
                      disabled={!((UPDATE.INIT && ticketState === 'INIT') || (UPDATE.CREA && ticketState === 'CREA'))}
                      toLowerCase={true}
                      rules={{
                        required: 'Please insert this field',
                        pattern: {
                          value: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g,
                          message: 'invalid email address',
                        },
                        maxLength: { value: 500, message: 'Max 500 Character' },
                      }}
                      tooltip={t('Email finance dari pihak vendor')}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
            <Accordion
              expanded={expanded.panelAddr}
              onChange={(e) => handleExpanded('panelAddr')}
              TransitionProps={{ unmountOnExit: true }}
            >
              <AccordionSummary
                sx={{
                  pointerEvents: 'none',
                }}
                expandIcon={
                  <ExpandMoreIcon
                    sx={{
                      pointerEvents: 'auto',
                    }}
                  />
                }
                id="panelAddr"
              >
                <div style={{ display: 'flex', gap: 2 }}>
                  <Typography>{t('Address Company')}</Typography>
                </div>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={9}>
                    <Box
                      sx={{
                        position: 'relative',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1,
                        borderStyle: 'solid',
                        borderWidth: '1px',
                        borderColor: theme.palette.grey[400],
                        borderRadius: '20px',
                        padding: 3,
                      }}
                    >
                      <p
                        style={{
                          position: 'absolute',
                          top: '-13px',
                          padding: '0 10px 0 10px',
                          margin: '0',
                          backgroundColor: 'white',
                          color: theme.palette.grey[600],
                        }}
                      >
                        {t('Alamat') + ' *'}
                      </p>
                      <p style={{ fontSize: '8pt', margin: '0', color: theme.palette.grey[600] }}>
                        {`Max 50 ${t('Karakter')} ${t(`Please fill without ',' (comma) character`)} ${t(
                          `Mohon dilanjutkan ke kolom berikutnya jika tidak cukup`
                        )}`}
                      </p>
                      <TextFieldComp
                        name="street"
                        t={t}
                        control={control}
                        maxLength={35}
                        disabled={
                          !(
                            (
                              (UPDATE.INIT && ticketState === 'INIT') ||
                              (UPDATE.CREA && ticketState === 'CREA') ||
                              (UPDATE.FINA && ticketState === 'FINA')
                            )
                            // || (UPDATE.FINA && ticketState === 'FINA')
                          )
                        }
                        rules={{
                          required: 'Please insert this field',
                          maxLength: { value: 35, message: 'Max 35 Character, continue to field below if not enough' },
                          pattern: { value: /^[^,]*$/, message: t(`Please fill without ',' (comma) character`) },
                        }}
                        toUpperCase={true}
                      />
                      <TextFieldComp
                        name="street2"
                        t={t}
                        control={control}
                        disabled={
                          !(
                            (UPDATE.INIT && ticketState === 'INIT') ||
                            (UPDATE.CREA && ticketState === 'CREA') ||
                            (UPDATE.FINA && ticketState === 'FINA')
                          )
                        }
                        rules={{
                          maxLength: { value: 35, message: 'Max 35 Character, continue to field below if not enough' },
                          pattern: { value: /^[^,]*$/, message: `Please fill without ',' (comma) character` },
                        }}
                        toUpperCase={true}
                      />
                      <TextFieldComp
                        name="street3"
                        t={t}
                        control={control}
                        disabled={
                          !(
                            (UPDATE.INIT && ticketState === 'INIT') ||
                            (UPDATE.CREA && ticketState === 'CREA') ||
                            (UPDATE.FINA && ticketState === 'FINA')
                          )
                        }
                        rules={{
                          maxLength: { value: 35, message: 'Max 35 Character, continue to field below if not enough' },
                          pattern: { value: /^[^,]*$/, message: `Please fill without ',' (comma) character` },
                        }}
                        toUpperCase={true}
                      />
                      <TextFieldComp
                        name="street4"
                        t={t}
                        control={control}
                        disabled={
                          !(
                            (UPDATE.INIT && ticketState === 'INIT') ||
                            (UPDATE.CREA && ticketState === 'CREA') ||
                            (UPDATE.FINA && ticketState === 'FINA')
                          )
                        }
                        rules={{
                          maxLength: { value: 35, message: 'Max 35 Character' },
                          pattern: { value: /^[^,]*$/, message: `Please fill without ',' (comma) character` },
                        }}
                        toUpperCase={true}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={3}></Grid>
                  <Grid item xs={5}>
                    <AutoCompleteSelect
                      name="city"
                      label={t('City') + ' *'}
                      t={t}
                      control={control}
                      disabled={!((UPDATE.INIT && ticketState === 'INIT') || (UPDATE.CREA && ticketState === 'CREA'))}
                      options={cities}
                      rules={{
                        required: 'Please insert this field',
                      }}
                      freeSolo={true}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <PatternFieldComp
                      name="postal"
                      label={t('Postal Code') + ' *'}
                      t={t}
                      control={control}
                      disabled={!((UPDATE.INIT && ticketState === 'INIT') || (UPDATE.CREA && ticketState === 'CREA'))}
                      rules={{
                        required: chgLocal === 'OVS' ? false : t('Please insert this field'),
                      }}
                      format="################"
                      isNumString={false}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
            <Accordion
              expanded={expanded.panelAddrnpwp}
              onChange={(e) => handleExpanded('panelAddrnpwp')}
              TransitionProps={{ unmountOnExit: true }}
            >
              <AccordionSummary
                sx={{
                  pointerEvents: 'none',
                }}
                expandIcon={
                  <ExpandMoreIcon
                    sx={{
                      pointerEvents: 'auto',
                    }}
                  />
                }
                id="panelAddr"
              >
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <Typography>{t('Address NPWP')}</Typography>
                </div>
              </AccordionSummary>
              <AccordionDetails>
                {(ticketState === 'INIT' || ticketState === 'CREA') && (
                  <Button onClick={(e) => sameWithAddrComp('npwp')}>{t('Same as Company Address')}</Button>
                )}
                <h4>
                  <em>{t('Isi bagian ini jika berbeda dengan alamat domisili perusahaan')}</em>
                </h4>
                <Grid container spacing={2}>
                  <Grid item xs={9}>
                    <Box
                      sx={{
                        display: 'flex',
                        position: 'relative',
                        flexWrap: 'wrap',
                        gap: 1,
                        borderStyle: 'solid',
                        borderWidth: '1px',
                        borderColor: theme.palette.grey[400],
                        borderRadius: '20px',
                        padding: 3,
                      }}
                    >
                      <p
                        style={{
                          position: 'absolute',
                          top: '-13px',
                          padding: '0 10px 0 10px',
                          margin: '0',
                          backgroundColor: 'white',
                          color: theme.palette.grey[600],
                        }}
                      >
                        {t('Alamat') + ' *'}
                      </p>
                      <p style={{ fontSize: '8pt', margin: '0', color: theme.palette.grey[600] }}>
                        {`Max 50 ${t('Karakter')} ${t(`Please fill without ',' (comma) character`)} ${t(
                          `Mohon dilanjutkan ke kolom berikutnya jika tidak cukup`
                        )}`}
                      </p>
                      <TextFieldComp
                        name="street_npwp"
                        t={t}
                        control={control}
                        disabled={
                          !(
                            (
                              (UPDATE.INIT && ticketState === 'INIT') ||
                              (UPDATE.CREA && ticketState === 'CREA') ||
                              (UPDATE.FINA && ticketState === 'FINA')
                            )
                            // || (UPDATE.FINA && ticketState === 'FINA')
                          )
                        }
                        rules={{
                          required: 'Please insert this field',
                          maxLength: { value: 35, message: 'Max 35 Character, continue to field below if not enough' },
                          pattern: { value: /^[^,]*$/, message: `Please fill without ',' (comma) character` },
                        }}
                        toUpperCase={true}
                      />
                      <TextFieldComp
                        name="street2_npwp"
                        t={t}
                        control={control}
                        disabled={
                          !(
                            (UPDATE.INIT && ticketState === 'INIT') ||
                            (UPDATE.CREA && ticketState === 'CREA') ||
                            (UPDATE.FINA && ticketState === 'FINA')
                          )
                        }
                        rules={{
                          maxLength: { value: 35, message: 'Max 35 Character, continue to field below if not enough' },
                          pattern: { value: /^[^,]*$/, message: `Please fill without ',' (comma) character` },
                        }}
                        toUpperCase={true}
                      />
                      <TextFieldComp
                        name="street3_npwp"
                        t={t}
                        control={control}
                        disabled={
                          !(
                            (UPDATE.INIT && ticketState === 'INIT') ||
                            (UPDATE.CREA && ticketState === 'CREA') ||
                            (UPDATE.FINA && ticketState === 'FINA')
                          )
                        }
                        rules={{
                          maxLength: { value: 35, message: 'Max 35 Character, continue to field below if not enough' },
                          pattern: { value: /^[^,]*$/, message: `Please fill without ',' (comma) character` },
                        }}
                        toUpperCase={true}
                      />
                      <TextFieldComp
                        name="street4_npwp"
                        t={t}
                        control={control}
                        disabled={
                          !(
                            (UPDATE.INIT && ticketState === 'INIT') ||
                            (UPDATE.CREA && ticketState === 'CREA') ||
                            (UPDATE.FINA && ticketState === 'FINA')
                          )
                        }
                        rules={{
                          maxLength: { value: 35, message: 'Max 35 Character' },
                          pattern: { value: /^[^,]*$/, message: `Please fill without ',' (comma) character` },
                        }}
                        toUpperCase={true}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={3}></Grid>
                  <Grid item xs={5}>
                    <AutoCompleteSelect
                      name="city_npwp"
                      t={t}
                      label={t('City') + ' *'}
                      control={control}
                      disabled={!((UPDATE.INIT && ticketState === 'INIT') || (UPDATE.CREA && ticketState === 'CREA'))}
                      options={cities}
                      rules={{
                        required: 'Please insert this field',
                      }}
                      freeSolo={true}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <PatternFieldComp
                      name="postal_npwp"
                      t={t}
                      label={t('Postal Code') + ' *'}
                      control={control}
                      disabled={!((UPDATE.INIT && ticketState === 'INIT') || (UPDATE.CREA && ticketState === 'CREA'))}
                      rules={{
                        required: chgLocal === 'OVS' ? false : 'Please insert this field',
                      }}
                      format="################"
                      isNumString={false}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
            <Accordion
              expanded={expanded.panelAddrsppkp}
              onChange={(e) => handleExpanded('panelAddrsppkp')}
              TransitionProps={{ unmountOnExit: true }}
            >
              <AccordionSummary
                sx={{
                  pointerEvents: 'none',
                }}
                expandIcon={
                  <ExpandMoreIcon
                    sx={{
                      pointerEvents: 'auto',
                    }}
                  />
                }
                id="panelAddr"
              >
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <Typography>{t('Address SPPKP')}</Typography>
                </div>
              </AccordionSummary>
              <AccordionDetails>
                {(ticketState === 'INIT' || ticketState === 'CREA') && (
                  <Button onClick={(e) => sameWithAddrComp('sppkp')}>{t('Same as Company Address')}</Button>
                )}
                <h4>
                  <em>{t('Isi bagian ini jika berbeda dengan alamat domisili perusahaan')}</em>
                </h4>

                <Grid container spacing={2}>
                  <Grid item xs={9}>
                    <Box
                      sx={{
                        position: 'relative',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1,
                        borderStyle: 'solid',
                        borderWidth: '1px',
                        borderColor: theme.palette.grey[400],
                        borderRadius: '20px',
                        padding: 3,
                      }}
                    >
                      <p
                        style={{
                          position: 'absolute',
                          top: '-13px',
                          padding: '0 10px 0 10px',
                          margin: '0',
                          backgroundColor: 'white',
                          color: theme.palette.grey[600],
                        }}
                      >
                        {t('Alamat') + ' *'}
                      </p>
                      <p style={{ position: 'relative', fontSize: '8pt', margin: '0', color: theme.palette.grey[600] }}>
                        {`Max 50 ${t('Karakter')} ${t(`Please fill without ',' (comma) character`)} ${t(
                          `Mohon dilanjutkan ke kolom berikutnya jika tidak cukup`
                        )}`}
                      </p>
                      <TextFieldComp
                        name="street_sppkp"
                        t={t}
                        control={control}
                        disabled={
                          !(
                            (
                              (UPDATE.INIT && ticketState === 'INIT') ||
                              (UPDATE.CREA && ticketState === 'CREA') ||
                              (UPDATE.FINA && ticketState === 'FINA')
                            )
                            // || (UPDATE.FINA && ticketState === 'FINA')
                          )
                        }
                        rules={{
                          required: 'Please insert this field',
                          maxLength: { value: 35, message: 'Max 35 Character, continue to field below if not enough' },
                          pattern: { value: /^[^,]*$/, message: `Please fill without ',' (comma) character` },
                        }}
                        toUpperCase={true}
                      />
                      <TextFieldComp
                        name="street2_sppkp"
                        t={t}
                        control={control}
                        disabled={
                          !(
                            (UPDATE.INIT && ticketState === 'INIT') ||
                            (UPDATE.CREA && ticketState === 'CREA') ||
                            (UPDATE.FINA && ticketState === 'FINA')
                          )
                        }
                        rules={{
                          maxLength: { value: 35, message: 'Max 35 Character, continue to field below if not enough' },
                          pattern: { value: /^[^,]*$/, message: `Please fill without ',' (comma) character` },
                        }}
                        toUpperCase={true}
                      />
                      <TextFieldComp
                        name="street3_sppkp"
                        t={t}
                        control={control}
                        disabled={
                          !(
                            (UPDATE.INIT && ticketState === 'INIT') ||
                            (UPDATE.CREA && ticketState === 'CREA') ||
                            (UPDATE.FINA && ticketState === 'FINA')
                          )
                        }
                        rules={{
                          maxLength: { value: 35, message: 'Max 35 Character, continue to field below if not enough' },
                          pattern: { value: /^[^,]*$/, message: `Please fill without ',' (comma) character` },
                        }}
                        toUpperCase={true}
                      />
                      <TextFieldComp
                        name="street4_sppkp"
                        t={t}
                        control={control}
                        disabled={
                          !(
                            (UPDATE.INIT && ticketState === 'INIT') ||
                            (UPDATE.CREA && ticketState === 'CREA') ||
                            (UPDATE.FINA && ticketState === 'FINA')
                          )
                        }
                        rules={{
                          maxLength: { value: 35, message: 'Max 35 Character' },
                          pattern: { value: /^[^,]*$/, message: `Please fill without ',' (comma) character` },
                        }}
                        toUpperCase={true}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={3}></Grid>
                  <Grid item xs={5}>
                    <AutoCompleteSelect
                      name="city_sppkp"
                      t={t}
                      label={t('City')}
                      control={control}
                      disabled={!((UPDATE.INIT && ticketState === 'INIT') || (UPDATE.CREA && ticketState === 'CREA'))}
                      options={cities}
                      rules={{
                        required: 'Please insert this field',
                      }}
                      freeSolo={true}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <PatternFieldComp
                      name="postal_sppkp"
                      t={t}
                      label={t('Postal Code')}
                      control={control}
                      disabled={!((UPDATE.INIT && ticketState === 'INIT') || (UPDATE.CREA && ticketState === 'CREA'))}
                      rules={{
                        required: chgLocal === 'OVS' ? false : 'Please insert this field',
                      }}
                      format="################"
                      isNumString={false}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
            <Accordion
              expanded={expanded.panelTax}
              onChange={(e) => handleExpanded('panelTax')}
              TransitionProps={{ unmountOnExit: true }}
            >
              <AccordionSummary
                sx={{
                  pointerEvents: 'none',
                }}
                expandIcon={
                  <ExpandMoreIcon
                    sx={{
                      pointerEvents: 'auto',
                    }}
                  />
                }
              >
                <Typography>{t('Tax and Payment')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <CheckboxComp
                      name="ispkp"
                      label="Pengusaha Kena Pajak (PKP)"
                      control={control}
                      disabled={
                        !(
                          (UPDATE.INIT && ticketState === 'INIT') ||
                          (UPDATE.CREA && ticketState === 'CREA' && loader_data.ticket_type === 'PROC')
                        )
                      }
                      onChangeovr={funChgIsPTKP}
                    />
                  </Grid>
                  <Grid item xs={9}></Grid>
                  <Grid item xs={4}>
                    <PatternFieldComp
                      name="npwp"
                      t={t}
                      helperText={'Mohon input hanya nominal tanpa karakter spesial'}
                      label={t('Tax Number') + ' *'}
                      useplaceholder
                      format="##.###.###.#-###.###"
                      mask={'_'}
                      control={control}
                      disabled={
                        !(
                          (UPDATE.INIT && ticketState === 'INIT') ||
                          (UPDATE.CREA && ticketState === 'CREA' && loader_data.ticket_type === 'PROC')
                        )
                      }
                      rules={{
                        pattern: {
                          value: /^[0-9.-]+$/,
                          message: 'format not matched. only numbers (0-9), point (.), and hyphen (-)',
                        },
                        minLength: {
                          required: chgIsPTKP ? 'Please insert this field' : false,
                          value: 20,
                          message: 'Karakter tidak cukup',
                        },
                        maxLength: {
                          value: 21,
                          message: 'Mohon isi dengan lengkap',
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <SelectComp
                      name="paymthd"
                      t={t}
                      label={t('Payment Method') + ' *'}
                      control={control}
                      options={[
                        { value: 'bank', label: 'Bank' },
                        { value: 'cash', label: 'Cash' },
                        { value: 'Giro', label: 'Giro' },
                      ]}
                      disabled={!((UPDATE.INIT && ticketState === 'INIT') || (UPDATE.CREA && ticketState === 'CREA'))}
                      rules={{
                        required: 'Please insert this field',
                      }}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <SelectComp
                      name="payterm"
                      t={t}
                      label={t('Payment Term') + ' *'}
                      control={control}
                      options={payterm.current}
                      disabled={!((UPDATE.INIT && ticketState === 'INIT') || (UPDATE.CREA && ticketState === 'CREA'))}
                      rules={{
                        required: 'Please insert this field',
                      }}
                      tooltip={t('Jangka waktu pembayaran')}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
            {(ticketState === 'CREA' || ticketState === 'FINA' || ticketState === 'END') && (
              <Accordion
                expanded={expanded.panelVendetail}
                onChange={(e) => handleExpanded('panelVendetail')}
                TransitionProps={{ unmountOnExit: true }}
              >
                <AccordionSummary
                  sx={{
                    pointerEvents: 'none',
                  }}
                  expandIcon={
                    <ExpandMoreIcon
                      sx={{
                        pointerEvents: 'auto',
                      }}
                    />
                  }
                >
                  <Typography>{t('Vendor Details')}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Alert variant="outlined" severity="warning" sx={{ mb: 1 }}>
                    {t('Perlu diisi oleh Procurement')}
                  </Alert>
                  <Grid container spacing={2}>
                    <Grid item xs={5}>
                      <SelectComp
                        name="company"
                        t={t}
                        label={t('Company') + ' *'}
                        control={control}
                        options={comps.current}
                        disabled={!(ticketState === 'CREA' && UPDATE.CREA)}
                        rules={{
                          required: 'Please insert this field',
                        }}
                        onChangeovr={funChgComp}
                      />
                    </Grid>
                    <Grid item xs={3}>
                      {/* <TextFieldComp
                        name="purchorg"
                        label="Purchasing Organization"
                        control={control}
                        disabled={!(ticketState === 'CREA' && UPDATE.CREA)}
                        rules={{
                          required: t('Please insert this field'),
                          maxLength: { value: 20, message: 'Max 20 Character' },
                        }}
                        toUpperCase={true}
                      /> */}
                      <AutoSelectPurOrg
                        name="purchorg"
                        label="Purchasing Organization *"
                        control={control}
                        disabled={!(ticketState === 'CREA' && UPDATE.CREA)}
                        rules={{
                          required: 'Please insert this field',
                        }}
                        company={chgComp}
                      />
                    </Grid>
                    <Grid item xs={3}></Grid>
                    <Grid item xs={3}>
                      <SelectComp
                        name="vengroup"
                        t={t}
                        label="Vendor Group *"
                        control={control}
                        options={vengroups}
                        onChangeovr={funChgVgrp}
                        disabled={!(ticketState === 'CREA' && UPDATE.CREA)}
                        rules={{
                          required: 'Please insert this field',
                        }}
                      />
                    </Grid>
                    <Grid item xs={3}>
                      <SelectComp
                        name="venacc"
                        t={t}
                        label="Vendor Account *"
                        control={control}
                        options={[
                          { value: 'TRADE', label: 'Trade' },
                          { value: 'NON_TRADE', label: 'Non Trade' },
                        ]}
                        onChangeovr={funChgVacc}
                        disabled={!(ticketState === 'CREA' && UPDATE.CREA)}
                        rules={{
                          required: 'Please insert this field',
                        }}
                      />
                    </Grid>
                    <Grid item xs={3}>
                      <SelectComp
                        name="ventype"
                        t={t}
                        label="Vendor Type *"
                        control={control}
                        options={
                          chgVenacc !== 'NON_TRADE'
                            ? [{ value: 'X', label: 'X' }]
                            : ventypeList[chgVengrp]
                            ? ventypeList[chgVengrp]
                            : [{ value: 'X', label: 'X' }]
                        }
                        disabled={!(ticketState === 'CREA' && UPDATE.CREA)}
                        rules={{
                          required: 'Please insert this field',
                        }}
                      />
                    </Grid>
                    <Grid item xs={3}></Grid>
                    <Grid item xs={3}>
                      <SelectComp
                        name="currency"
                        t={t}
                        label={t('Limit Currency') + `${chgVenacc === 'TRADE' ? ' *' : ''}`}
                        control={control}
                        options={currencies}
                        onChangeovr={funChgCurr}
                        disabled={chgVenacc === 'NON_TRADE' || !(ticketState === 'CREA' && UPDATE.CREA)}
                        rules={{ required: chgVenacc === 'TRADE' ? 'Please insert this field' : false }}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <NumericFieldComp
                        t={t}
                        name="limit"
                        label={t('Limit') + `${chgVenacc === 'TRADE' ? ' *' : ''}`}
                        control={control}
                        format={['thousandSeparator']}
                        currency={chgCurr}
                        disabled={chgVenacc === 'NON_TRADE' || !(ticketState === 'CREA' && UPDATE.CREA)}
                        rules={{ required: chgVenacc === 'TRADE' ? t('Please insert this field') : false }}
                      />
                    </Grid>
                    <Grid item xs={4}></Grid>
                    <Grid item xs={5}>
                      <CheckboxComp
                        name="is_tender"
                        label={t('Vendor Tender Participant')}
                        control={control}
                        disabled={!(ticketState === 'CREA' && UPDATE.CREA)}
                        onChangeovr={funChgTdr}
                      />
                      <CheckboxComp
                        name="is_priority"
                        label={t('Vendor Priority')}
                        control={control}
                        disabled={!(ticketState === 'CREA' && UPDATE.CREA)}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextFieldComp
                        t={t}
                        name="description"
                        label="Description *"
                        // helperText={t('Wajib diisi jika vendor mengikuti tender')}
                        control={control}
                        disabled={!(ticketState === 'CREA' && UPDATE.CREA)}
                        rules={{ required: 'Please insert this field' }}
                        tooltip={t('Alasan memilih vendor tersebut menjadi rekanan KPN')}
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            )}
          </form>
          <form onSubmit={handleSubmit1(handleReject)}>
            <Dialog
              open={modalRejectopen}
              onClose={modalRejectclose}
              maxWidth="lg"
              sx={{ zIndex: (theme) => theme.zIndex.drawer - 2 }}
            >
              <DialogTitle>{t('Reject Form')}</DialogTitle>
              <Box sx={{ width: '40rem', display: 'flex', flexDirection: 'column', gap: 5, p: 2, mb: 3 }}>
                <Alert severity="warning">
                  <AlertTitle>{t('Please provide rejection reasons')}</AlertTitle>{' '}
                  {t('Your current works will not be saved when rejecting form')}
                </Alert>
                <TextFieldComp
                  name="remarks"
                  label="remarks"
                  control={control1}
                  rules={{
                    required: 'Please provide rejection reason',
                  }}
                  multiline
                />
              </Box>
              <DialogActions>
                <Button type="submit" color="error" variant="contained" onClick={handleSubmit1(handleReject)}>
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    setModalopen(false);
                  }}
                  variant="contained"
                >
                  Cancel
                </Button>
              </DialogActions>
            </Dialog>
          </form>
          <Accordion
            expanded={expanded.panelBank}
            onChange={(e) => handleExpanded('panelBank')}
            TransitionProps={{ unmountOnExit: true }}
          >
            <AccordionSummary
              sx={{
                pointerEvents: 'none',
              }}
              expandIcon={
                <ExpandMoreIcon
                  sx={{
                    pointerEvents: 'auto',
                  }}
                />
              }
            >
              <Typography>{t('Bank Information')}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {(UPDATE.INIT || UPDATE.CREA) &&
                (ticketState === 'INIT' || (ticketState === 'CREA' && loader_data.ticket_type === 'PROC')) && (
                  <LoadingButton
                    onClick={(e) => {
                      handleAddNewBank();
                    }}
                    loading={loadAddBank}
                  >
                    + Add Bank
                  </LoadingButton>
                )}
              {errors.bank && <p style={{ color: 'red' }}>{t('Please insert this field')}</p>}
              <VenBankTableRefactor
                control={control}
                fields={fields}
                append={append}
                remove={remove}
                getValues={getValues}
                countries={countries.current}
                currencies={currencies}
                watch={watch}
                is_local={chgLocal === 'LOCAL'}
                is_allow={
                  (UPDATE.INIT || UPDATE.CREA) &&
                  (ticketState === 'INIT' || (ticketState === 'CREA' && loader_data.ticket_type === 'PROC'))
                }
                t={t}
                ven_id={loader_data.ven_id}
                clearField={resetField}
                setValue={setValue}
              />
              {/* <VenBankTable
                onChildDataChange={setVen_bankFromChild}
                initData={initDataBank}
                idParent={loader_data.ven_id}
                banks={banks.current}
                currencies={currencies}
                countries={countries.current}
                formfield={{ fields: fields, append: append, remove: remove, isValid: isValid, errors: errors }}
                isallow={
                  (UPDATE.INIT || UPDATE.CREA) &&
                  (ticketState === 'INIT' || (ticketState === 'CREA' && loader_data.ticket_type === 'PROC'))
                }
                ticketState={ticketState}
                isLoad={loadingInitBank}
                isLocal={chgLocal === 'LOCAL'}
                t={t}
                apiTable={apiRef}
                setCurrentEdit={updateCurrentEdit}
              /> */}
            </AccordionDetails>
          </Accordion>
          <Accordion
            expanded={expanded.panelFile}
            onChange={(e) => handleExpanded('panelFile')}
            TransitionProps={{ unmountOnExit: true }}
          >
            <AccordionSummary
              sx={{
                pointerEvents: 'none',
              }}
              expandIcon={
                <ExpandMoreIcon
                  sx={{
                    pointerEvents: 'auto',
                  }}
                />
              }
            >
              <Typography>{t('File Upload')}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Alert severity="warning" variant="filled" sx={{ minWidth: '20rem', mt: '1rem', mb: '1rem' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  {t('Please Download')}
                  <Link
                    href={
                      langCode === 'id'
                        ? `${import.meta.env.VITE_URL_LOC}/master/file/Kode_Etik_Supplier_Vendor_dan_Kontraktor.doc`
                        : `${
                            import.meta.env.VITE_URL_LOC
                          }/master/file/Integrity_Pact_Supplier_Vendor_and_Contractor.docx`
                    }
                  >
                    Link Download File Pakta Integritas
                  </Link>
                </Box>
              </Alert>
              {ticketState === 'CREA' && (
                <Alert severity="warning" variant="filled" sx={{ minWidth: '20rem', mt: '1rem', mb: '1rem' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    {t('Please Download Justifikasi')}
                    <Link href={`${import.meta.env.VITE_URL_LOC}/master/file/Form_VENDOR_LOCAL_JUSTIFIKASI.docx`}>
                      Link Download File Form Justifikasi
                    </Link>
                  </Box>
                </Alert>
              )}
              <UploadButton
                inputTypes={fileType}
                iniData={initDataFile}
                idParent={loader_data.ven_id}
                onChildDataChange={setVen_fileFromChild}
                loadData={loadingInitFile}
                allow={(UPDATE.INIT && ticketState === 'INIT') || (UPDATE.CREA && ticketState === 'CREA')}
                deleteFile={deleteVenFile}
                requiredFiles={errors && Object.values(errors.file_atth ?? {})}
                ref={uploadButRef}
                fileCheck={getValues('file_atth')}
                t={t}
                langCode={langCode}
                ticketState={ticketState}
              />
            </AccordionDetails>
          </Accordion>
          {(ticketState === 'FINA' || ticketState === 'END') && (
            <Accordion
              expanded={expanded.panelApproval}
              onChange={(e) => handleExpanded('panelApproval')}
              TransitionProps={{ unmountOnExit: true }}
            >
              <AccordionSummary
                sx={{ pointerEvents: 'none' }}
                expandIcon={<ExpandMoreIcon sx={{ pointerEvents: 'auto' }} />}
              >
                <Typography>Approval</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextFieldComp
                      name="vendorcode"
                      label="Vendor Code"
                      control={control}
                      disabled={!(ticketState === 'FINA' && UPDATE.FINA)}
                      rules={{
                        required: t('Please insert this field'),
                        maxLength: {
                          value: 10,
                          message: 'Max character is 10',
                        },
                        minLength: {
                          value: 9,
                          message: t('Please insert this field'),
                        },
                      }}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          )}
          {loader_data.logrej_counter !== null && (
            <Accordion
              expanded={expanded.panelRejectLog}
              onChange={(e) => handleExpanded('panelRejectLog')}
              TransitionProps={{ unmountOnExit: true }}
            >
              <AccordionSummary
                sx={{ pointerEvents: 'none' }}
                expandIcon={<ExpandMoreIcon sx={{ pointerEvents: 'auto' }} />}
              >
                <Typography>{t('Rejection Log')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ my: 5, backgroundColor: 'white', borderRadius: '12px' }}>
                  {/* <TextFieldComp name="remarks_disabled" label="Rejection Remarks" control={control} disabled={true} /> */}
                  <RejectLog ticket_id={loader_data.ticket_id} ticket_state={ticketState} />
                </Box>
              </AccordionDetails>
            </Accordion>
          )}

          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
            <Box>
              {loader_data.permission === undefined && (
                <Button
                  sx={{ height: 50, width: 100, margin: 2 }}
                  color="error"
                  variant="text"
                  onClick={() => {
                    navigate('../ticket');
                  }}
                >
                  {t('Back')}
                </Button>
              )}
            </Box>
            <Box>
              {UPDATE[ticketState] && loader_data.cur_pos !== 'MGR' && (
                <Button
                  sx={{ height: 50, width: 120, margin: 2 }}
                  color="warning"
                  variant="contained"
                  type="submit"
                  onClick={() => {
                    // console.log(value);
                    is_draft.current = true;
                    submitForm(getValues());
                  }}
                  disabled={btnClicked}
                >
                  {t('Save Draft')}
                </Button>
              )}
              {((ticketState === 'CREA' && UPDATE.CREA && loader_data.ticket_type !== 'PROC') ||
                (ticketState === 'CREA' && UPDATE.CREA && loader_data.cur_pos === 'MGRPRC') ||
                (ticketState === 'FINA' && UPDATE.FINA && loader_data.cur_pos !== 'MGR')) && (
                <Button
                  sx={{ height: 50, width: 100, margin: 2 }}
                  color="error"
                  variant="contained"
                  onClick={() => {
                    setModalopen(true);
                  }}
                >
                  {t('Reject')}
                </Button>
              )}
              {UPDATE[ticketState] && loader_data.cur_pos !== 'MGR' && (
                <Button
                  sx={{ height: 50, width: 100, margin: 2 }}
                  variant="contained"
                  type="submit"
                  onClick={() => {
                    // console.log(testSubmitForm());
                    handleSubmit((value) => {
                      // console.log(value);
                      is_draft.current = false;
                      if (isTender && ticketState === 'CREA' && isValid && bank_valid.current) {
                        setConfOpen(true);
                      } else {
                        submitForm(value);
                      }
                    })();
                  }}
                  disabled={btnClicked}
                >
                  {t('Submit')}
                </Button>
              )}
            </Box>
          </Box>
        </Container>

        <Snackbar
          open={formStat.stat}
          onClose={handleSnackClose}
          autoHideDuration={3000}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert severity={formStat.type} onClose={handleSnackClose} variant="filled">
            {formStat.message}
          </Alert>
        </Snackbar>
        <Snackbar
          open={loader_data.ticketState !== 'INIT' && loader_data.ticket_type === 'VENDOR' && UPDATE.INIT}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert severity="success" variant="filled">
            {`${t('Ticket Number')} ${loader_data.ticket_num} ${t('has already submitted')}`}
          </Alert>
        </Snackbar>
        <Backdrop
          sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
          open={
            loading
            // || loadingCountry || loadingCurr || loadingBanks || loadingInitFile || loadingComp || loadingPayterm
          }
        >
          <CircularProgress color="inherit" disableShrink />
        </Backdrop>
        <Dialog open={formStat.stat && formStat.type === 'success' && is_draft.current == false}>
          <Box
            sx={{
              width: 500,
              height: 200,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'success.main',
            }}
          >
            <Typography variant="h4" sx={{ m: 2, borderRadius: 2 }} align="justify">
              {formStat.message}
            </Typography>
          </Box>
        </Dialog>
        <ConfirmComponent
          open={modalConfirmopen}
          handleConfirm={confirmActionFun}
          onCloseConf={modalConfclose}
          sx={{ zIndex: (theme) => theme.zIndex.drawer - 2 }}
          confirmText={t(`You're about to send this form to CEO/CFO, are you sure ?`)}
          t={t}
        />
      </Container>
    </>
  );
}

export default RefactorFormVendorPage;
