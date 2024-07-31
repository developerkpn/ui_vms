import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Container,
  Grid,
  TextField,
  Typography,
  Box,
  Select,
  InputLabel,
  MenuItem,
  FormControl,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Button,
  FormHelperText,
  Snackbar,
  Alert,
  CircularProgress,
  Backdrop,
  Dialog,
  Skeleton,
  Link,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { NumericFormat } from 'react-number-format';
import { useState, useRef, useEffect } from 'react';
import { VenBankTable } from 'src/components/FormVendor';
import UploadButton from 'src/components/common/UploadButton';
import { useLoaderData, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useSession } from 'src/provider/sessionProvider';

const ventypeList = {
  '3RD_PARTY': [
    ['MATERIAL', 'Material'],
    ['CONTRACTOR', 'Contractor'],
    ['INSURANCE', 'Insurance'],
    ['ONE_TIME', 'One time'],
    ['OTHER', 'Other'],
    ['TRANSPORTER', 'Transporter'],
  ],
  INTERCO: [
    ['MATERIAL', 'Material'],
    ['CONTRACTOR', 'Contractor'],
    ['INSURANCE', 'Insurance'],
    ['OTHER', 'Other'],
    ['TRANSPORTER', 'Transporter'],
  ],
  RELATED: [
    ['MATERIAL', 'Material'],
    ['CONTRACTOR', 'Contractor'],
    ['INSURANCE', 'Insurance'],
    ['OTHER', 'Other'],
    ['TRANSPORTER', 'Transporter'],
  ],
};

export default function FormVendorPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { session } = useSession();
  const loader_data = useLoaderData();
  const ttoken = params.token;
  const initialForm = useRef({});
  const [title, setTitle] = useState('');
  const [local_ovs, setLocalovs] = useState('');
  const [lim_curr, setLimitCurr] = useState('');
  const [lim_ven, setLimven] = useState('');
  const [country_ven, setCountryven] = useState('');
  const [city_ven, setCityven] = useState('');
  const [pay_mthd, setPayMthd] = useState('');
  const [pay_term, setPayTerm] = useState('');
  const [comp, setComp] = useState('');
  const [venAcc, setVenacc] = useState('');
  const [venGroup, setVengroup] = useState('');
  const [venType, setVentype] = useState('');
  const [is_pkp, setIspkp] = useState(false);
  const [is_tender, setIstender] = useState(false);
  const [changeCtry, setChangectry] = useState(false);
  const [changeVenDet, setChangevdet] = useState(false);
  const [isDraft, setIsdraft] = useState(false);

  const comp_name = useRef();
  const address = useRef();
  const postalcode = useRef();
  const telf = useRef();
  const fax = useRef();
  const tax_num = useRef();
  const email_ven = useRef();
  const banks = useRef();
  const comps = useRef();
  const initDataBank = useRef();
  const initDataFile = useRef();
  const ven_details = useRef();
  const ven_desc = useRef();
  const purOrg = useRef();
  const ven_code = useRef();
  const remarks = useRef();

  const [formStat, setFormStat] = useState({
    stat: false,
    type: 'info',
    message: '',
  });
  const [ven_bank, setVen_bank] = useState([]);
  const [ven_file, setVen_file] = useState([]);
  const [cities, setCities] = useState([]);
  const [countries, setCountries] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [expanded, setExpanded] = useState({
    panelReqDet: true,
    panelCompDet: true,
    panelAddr: true,
    panelTax: true,
    panelBank: true,
    panelFile: true,
    panelVendetail: true,
    panelApproval: true,
  });
  const [loader, setLoader] = useState(true);
  const [refLoad, setRefload] = useState(false);
  const [stateLoad, setStateLoad] = useState(false);
  const [fileLoad, setFileLoad] = useState(false);
  const [bankLoad, setBankLoad] = useState(false);
  const [banksLoad, setBanksLoad] = useState(false);
  const [currLoad, setCurrLoad] = useState(false);
  const [countryLoad, setCountryLoad] = useState(false);
  const section = loader_data.section;
  const allow = loader_data.data.cur_pos === (loader_data.role != '' ? loader_data.role : session.role);
  const seeAll = loader_data.data.cur_pos === 'MGR' || loader_data.data.cur_pos === 'END' ? true : false;

  let errObj = {};
  let errorFields = [
    'title',
    'local_ovs',
    'name_1',
    'country',
    'street',
    'postal',
    'city',
    'telf1',
    'fax',
    'email',
    'npwp',
    'pay_mthd',
    'pay_term',
  ];

  if (loader_data.data.cur_pos == 'PROC' || seeAll) {
    errorFields.push(
      'company',
      'purch_org',
      'ven_group',
      'ven_acc',
      'ven_type',
      'ven_code',
      'lim_curr',
      'limit_vendor'
    );
  } else if (loader_data.data.cur_pos == 'MDM' || seeAll) {
    errorFields.push(
      'company',
      'purch_org',
      'ven_group',
      'ven_acc',
      'ven_type',
      'ven_code',
      'lim_curr',
      'limit_vendor'
    );
  }
  errorFields.map((item) => {
    errObj[item] = {
      stat: false,
      message: '',
      touched: false,
    };
  });
  const [errorState, setErrorState] = useState(errObj);

  //set active section

  useEffect(() => {
    setChangectry(true);
    const controller = new AbortController();
    const getTimeout = setTimeout(() => {
      const dynaCity = async () => {
        try {
          const cities = await axios.post(
            `${process.env.REACT_APP_URL_LOC}/master/city`,
            { countryId: country_ven },
            { signal: controller.signal }
          );
          const result = cities.data.data;
          setCities(result.data);
          setChangectry(false);
        } catch (err) {
          alert(err.stack);
        }
      };
      dynaCity();
    }, 500);
    return () => {
      clearTimeout(getTimeout);
      controller.abort();
    };
  }, [country_ven]);

  useEffect(() => {
    const controller = new AbortController();
    const dynaCountry = async () => {
      try {
        const country = await axios.post(
          `${process.env.REACT_APP_URL_LOC}/master/country`,
          {},
          { signal: controller.signal }
        );
        const result = country.data.data;
        setCountries(result.data);
        setCountryLoad(true);
      } catch (err) {
        alert(err.stack);
      }
    };

    const getCurr = async () => {
      try {
        const curr = await axios.get(`${process.env.REACT_APP_URL_LOC}/master/curr`);
        const response = curr.data;
        const result = response.data;
        let currobj = {};
        result.data.map((item) => {
          currobj[item.id_cur] = item.code;
        });
        setCurrencies(currobj);
        setCurrLoad(true);
      } catch (err) {
        alert(err.stack);
      }
    };

    const getBanks = async () => {
      try {
        const banksData = await axios.get(`${process.env.REACT_APP_URL_LOC}/master/bank`);
        const response = banksData.data;
        const result = response.data;
        banks.current = result.data;
        setBanksLoad(true);
      } catch (error) {
        alert(error.stack);
      }
    };

    const getInitDataBank = async () => {
      try {
        const bankInit = await axios.get(`${process.env.REACT_APP_URL_LOC}/vendor/bank/${loader_data.data.ven_id}`);
        const result = bankInit.data.data;
        initDataBank.current = result.data;
        setBankLoad(true);
      } catch (err) {
        alert(err.stack);
      }
    };

    const getInitDataFile = async () => {
      try {
        const fileInit = await axios.get(`${process.env.REACT_APP_URL_LOC}/vendor/file/${loader_data.data.ven_id}`);
        const result = fileInit.data.data;
        initDataFile.current = result.data;
        setFileLoad(true);
      } catch (err) {
        alert(err.stack);
      }
    };

    const getCompany = async () => {
      try {
        const compsData = await axios.get(`${process.env.REACT_APP_URL_LOC}/master/company`);
        const response = compsData.data;
        const result = response.data;
        comps.current = result.data;
      } catch (error) {
        alert(error.stack);
      }
    };

    const lastDataForm = () => {
      console.log(loader_data);
      comp_name.current.value = loader_data.data.name_1 ? loader_data.data.name_1 : '';
      address.current.value = loader_data.data.street ? loader_data.data.street : '';
      postalcode.current.value = loader_data.data.postal ? loader_data.data.postal : '';
      telf.current.value = loader_data.data.telf1 ? loader_data.data.telf1 : '';
      fax.current.value = loader_data.data.fax ? loader_data.data.fax : '';
      tax_num.current.value = loader_data.data.npwp ? loader_data.data.npwp : '';
      email_ven.current.value = loader_data.data.email ? loader_data.data.email : '';
      if (loader_data.data.remarks != null) {
        remarks.current.value = loader_data.data.remarks;
      }
      if (loader_data.data.cur_pos === 'PROC' || loader_data.data.cur_pos === 'MDM' || seeAll) {
        ven_desc.current.value = loader_data.data.description;
        purOrg.current.value = loader_data.data.purch_org;
      }
      if (loader_data.data.cur_pos === 'MDM' || seeAll) {
        console.log(loader_data.data);
        remarks.current.value = loader_data.data.remarks;
        ven_code.current.value = loader_data.data.ven_code;
      }
      setRefload(true);
    };

    const lastStateForm = () => {
      setTimeout(() => {
        setIstender(loader_data.data.is_tender ? loader_data.data.is_tender : false);
        setIspkp(loader_data.data.is_pkp ? loader_data.data.is_pkp : false);
        setLocalovs(loader_data.data.local_ovs ? loader_data.data.local_ovs : '');
        setLimitCurr(loader_data.data.lim_curr ? loader_data.data.lim_curr : '');
        setLimven(
          typeof loader_data.data.limit_vendor == 'number'
            ? loader_data.data.limit_vendor.toString()
            : loader_data.data.limit_vendor
        );
        setCountryven(loader_data.data.country ? loader_data.data.country : '');
        setPayMthd(loader_data.data.pay_mthd ? loader_data.data.pay_mthd : '');
        setPayTerm(loader_data.data.pay_term ? loader_data.data.pay_term : '');
        setComp(loader_data.data.company ? loader_data.data.company : '');
        setVenacc(loader_data.data.ven_acc ? loader_data.data.ven_acc : '');
        setVengroup(loader_data.data.ven_group ? loader_data.data.ven_group : '');
        setVentype(loader_data.data.ven_type ? loader_data.data.ven_type : '');
        setTitle(loader_data.data.title ? loader_data.data.title : '');
        setCityven(loader_data.data.city ? loader_data.data.city : '');
        getInitDataBank();
        getInitDataFile();
        setStateLoad(true);
      }, 1000);
    };

    const getTimeout = setTimeout(() => {
      getCurr();
      initialForm.current = {
        is_draft: false,
        ticket_id: ttoken,
        ticket_num: loader_data.data.ticket_id,
        ven_id: loader_data.data.ven_id ? loader_data.data.ven_id : loader_data.data.ticket_ven_id,
        email_head: loader_data.data.email_proc,
        dept_head: loader_data.data.dep_proc,
        cur_pos: loader_data.data.cur_pos,
      };
      getBanks();
      getCompany();
      dynaCountry();
    }, 500);
    lastDataForm();
    lastStateForm();
    const loaderProg = setTimeout(() => {
      setLoader(false);
    }, 3000);
    return () => {
      clearTimeout(getTimeout);
      clearTimeout(lastStateForm);
      clearTimeout(loaderProg);
    };
  }, []);

  const setVen_bankFromChild = (newItem) => {
    setVen_bank(newItem);
  };

  const setVen_fileFromChild = (newItem) => {
    setVen_file(newItem);
  };

  const handleSubmit = (is_draft) => async (event) => {
    let isError = false;
    ven_details.current = {
      ven_id: initialForm.current.ven_id ? initialForm.current.ven_id : initialForm.current.ticket_ven_id,
      ticket_num: initialForm.current.ticket_num,
      title: title ? title : '',
      name_1: comp_name.current.value.trim(),
      local_ovs: local_ovs,
      postal: postalcode.current.value.trim(),
      country: country_ven,
      city: city_ven,
      street: address.current.value.trim(),
      telf1: telf.current.value.trim(),
      fax: fax.current.value.trim(),
      email: email_ven.current.value.trim(),
      is_pkp: is_pkp,
      is_tender: is_tender,
      npwp: tax_num.current.value.trim(),
      pay_mthd: pay_mthd,
      pay_term: pay_term,
    };
    if (loader_data.data.cur_pos == 'PROC' || loader_data.data.cur_pos == 'MDM') {
      ven_details.current = {
        ...ven_details.current,
        company: comp,
        purch_org: purOrg.current.value,
        ven_acc: venAcc,
        ven_group: venGroup,
        ven_type: venType,
        description: ven_desc.current.value,
        limit_vendor: lim_ven ? lim_ven.match(/\d+/g)?.join('') : 0,
        lim_curr: lim_curr,
      };
      if (loader_data.data.cur_pos == 'MDM') {
        if (is_draft) {
          ven_details.current = {
            ...ven_details.current,
            ven_code: ven_code.current.value,
          };
        } else {
          ven_details.current = {
            ...ven_details.current,
            ven_code: ven_code.current.value,
            is_active: true,
          };
        }
      }
    }
    const jsonSend = {
      role: session.role,
      is_draft: is_draft,
      ticket_id: initialForm.current.ticket_id,
      remarks: remarks.current ? remarks.current.value : '',
      ven_detail: ven_details.current,
      ven_banks: ven_bank,
      ven_files: ven_file,
    };
    const newErrorState = {};
    Object.keys(ven_details.current).map(async (item) => {
      if (
        (typeof ven_details.current[item] === 'string'
          ? ven_details.current[item]?.trim().length === 0
          : false ||
            ven_details.current[item] === '' ||
            ven_details.current[item] === 0 ||
            ven_details.current[item] === null ||
            ven_details.current[item] === undefined) &&
        (item !== 'description' || item !== 'is_pkp' || item !== 'is_tender' || item !== 'ven_id')
      ) {
        newErrorState[item] = {
          stat: true,
          message: 'Please fill this field',
          touched: true,
        };
        isError = true;
      } else {
        let value = ven_details.current[item];
        const check = validateInput(item, value);
        if (check.stat == true) {
          newErrorState[item] = {
            stat: true,
            message: check.message,
            touched: true,
          };
          isError = true;
        } else {
          newErrorState[item] = {
            stat: false,
            message: '',
            touched: true,
          };
        }
      }
    });
    console.log(newErrorState);
    setErrorState({ ...newErrorState, isError: isError });
    if (!isError) {
      console.log(jsonSend);
      setLoader(true);
      try {
        let submit;
        if (loader_data.role === 'VENDOR') {
          submit = await axios.post(`${process.env.REACT_APP_URL_LOC}/ticket/newform/submit`, jsonSend);
        } else {
          submit = await axios.post(`${process.env.REACT_APP_URL_LOC}/ticket/form/submit`, jsonSend);
        }
        const response = submit.data;
        setFormStat({ stat: true, type: 'success', message: response.message });
        setLoader(false);
        if (!is_draft) {
          setIsdraft(false);
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        } else {
          setIsdraft(true);
        }
      } catch (err) {
        console.log(err.stack);
        alert(err.stack);
        setFormStat({ stat: true, type: 'error', message: 'error submitting' });
        setLoader(false);
      }
    } else {
      setFormStat({
        stat: true,
        type: 'error',
        message: 'Fields fill not allowed or still empty',
      });
    }
  };

  const handleExpanded = (panel) => () => {
    if (panel === 'panelReqDet') {
      setExpanded({
        ...expanded,
        panelReqDet: expanded.panelReqDet ? false : true,
      });
    } else if (panel === 'panelCompDet') {
      setExpanded({
        ...expanded,
        panelCompDet: expanded.panelCompDet ? false : true,
      });
    } else if (panel === 'panelAddr') {
      setExpanded({
        ...expanded,
        panelAddr: expanded.panelAddr ? false : true,
      });
    } else if (panel === 'panelTax') {
      setExpanded({
        ...expanded,
        panelTax: expanded.panelTax ? false : true,
      });
    } else if (panel === 'panelBank') {
      setExpanded({
        ...expanded,
        panelBank: expanded.panelBank ? false : true,
      });
    } else if (panel === 'panelFile') {
      setExpanded({
        ...expanded,
        panelFile: expanded.panelFile ? false : true,
      });
    } else if (panel === 'panelVendetail') {
      setExpanded({
        ...expanded,
        panelVendetail: expanded.panelVendetail ? false : true,
      });
    } else if (panel === 'panelApproval') {
      setExpanded({
        ...expanded,
        panelApproval: expanded.panelApproval ? false : true,
      });
    }
  };

  const handleErrCheck = (e) => {
    setTimeout(async () => {
      if (ven_details.current === undefined) {
        return;
      }
      const elem = e.target.name;
      ven_details.current[elem] = e.target.value;
      if (
        errorState[elem].touched &&
        (ven_details.current[elem] !== null ||
        ven_details.current[elem] !== undefined ||
        typeof ven_details.current[elem] === 'string'
          ? ven_details.current[elem]?.trim().length !== 0
          : false || ven_details.current[elem] !== 0 || ven_details.current[elem] !== '')
      ) {
        let value = ven_details.current[elem];
        const check = validateInput(elem, value);
        if (check.stat == true) {
          setErrorState((errorState) => ({
            ...errorState,
            [elem]: {
              stat: true,
              message: check.message,
              touched: true,
            },
          }));
        } else {
          setErrorState((errorState) => ({
            ...errorState,
            [elem]: {
              stat: false,
              message: '',
              touched: true,
            },
          }));
        }
      } else {
        setErrorState((errorState) => ({
          ...errorState,
          [elem]: {
            stat: true,
            message: 'Please fill this field',
            touched: true,
          },
        }));
      }
    }, 500);
  };

  const handleSnackClose = (e, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setFormStat({ ...formStat, stat: false });
  };

  const handleReject = async () => {
    setLoader(true);
    try {
      const rejectParams = {
        ticket_id: initialForm.current.ticket_id,
        remarks: remarks.current.value,
      };
      const resultReject = await axios.patch(`${process.env.REACT_APP_URL_LOC}/ticket/reject`, rejectParams);
      const response = resultReject.data;
      setFormStat({ stat: true, type: 'success', message: response.message });
      setLoader(false);
      navigate(0);
    } catch (error) {
      setLoader(false);
      alert(error);
    }
  };

  const validateInput = (field, value) => {
    let regexpat = '';
    switch (field) {
      case 'email':
        regexpat = /[a-z0-9]+@[a-z]+\.[a-z]{2,3}/;
        if (!regexpat.test(value)) {
          return { stat: true, message: 'Please fill email field' };
        } else {
          return { stat: false, message: '' };
        }
      case 'postal':
        regexpat = /[0-9]/;
        if (!regexpat.test(value)) {
          return { stat: true, message: 'Please input just numeric value' };
        } else {
          return { stat: false, message: '' };
        }
      case 'street':
        if (value?.trim().length > 30) {
          return { stat: true, message: 'Please input below 30 characters' };
        } else {
          return { stat: false, message: '' };
        }
      case 'name_1':
        if (value?.trim().length > 35) {
          return { stat: true, message: 'Please input below 30 characters' };
        } else {
          return { stat: false, message: '' };
        }
      case 'purch_org':
        if (value?.trim().length > 10) {
          return { stat: true, message: 'Please input below 10 characters' };
        } else {
          return { stat: false, message: '' };
        }
      case 'telf1':
        if (value?.trim().length >= 20) {
          return { stat: true, message: 'Please input below 20 characters' };
        } else {
          return { stat: false, message: '' };
        }
      case 'fax':
        if (value?.trim().length >= 31) {
          return { stat: true, message: 'Please input below 31 characters' };
        } else {
          return { stat: false, message: '' };
        }
      case 'npwp':
        if (value?.trim().length >= 28) {
          return { stat: true, message: 'Please input below 28 characters' };
        } else {
          return { stat: false, message: '' };
        }
      case 'description':
        if (value?.trim().length >= 28) {
          return { stat: true, message: 'Please input below 300 characters' };
        } else {
          return { stat: false, message: '' };
        }
      default:
        return { stat: false, message: '' };
    }
  };

  return (
    <>
      <Container maxWidth="xl">
        <Box sx={{ height: 120, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Typography variant="h4" gutterBottom>
            {`Form Vendor Registration ${loader_data.data.ticket_id}`}
          </Typography>
        </Box>
        <Container>
          <Accordion expanded={expanded.panelReqDet} onChange={handleExpanded('panelReqDet')}>
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
              <Typography>Requestor</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs>
                  <TextField
                    fullWidth
                    id="emailRequestor"
                    label="Email"
                    variant="outlined"
                    value={initialForm.current.email_head ? initialForm.current.email_head : ''}
                    InputProps={{
                      readOnly: true,
                    }}
                  />
                </Grid>
                <Grid item xs>
                  <TextField
                    fullWidth
                    id="deptRequestor"
                    label="Department"
                    variant="outlined"
                    value={initialForm.current.dept_head ? initialForm.current.dept_head : ''}
                    InputProps={{
                      readOnly: true,
                    }}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
          <Accordion expanded={expanded.panelCompDet} onChange={handleExpanded('panelCompDet')}>
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
              <Typography>Company Details</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={3}>
                  <FormControl fullWidth>
                    <InputLabel error={errorState.title.stat} id="title-label">
                      Title
                    </InputLabel>
                    <Select
                      id="titleComp"
                      labelId="title-label"
                      label="title"
                      variant="outlined"
                      name="title"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        handleErrCheck(e);
                      }}
                      inputProps={{
                        readOnly: !(section === 'VENDOR' && allow),
                      }}
                    >
                      <MenuItem value={'COMPANY'}>Company</MenuItem>
                      <MenuItem value={'PERSONAL'}>Personal</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={3}>
                  <FormControl fullWidth>
                    <InputLabel error={errorState.local_ovs.stat} id="local-ovs-label">
                      Local / Overseas
                    </InputLabel>
                    <Select
                      id="localOverseas"
                      labelId="local-ovs-label"
                      label="Local / Overseas"
                      variant="outlined"
                      name="local_ovs"
                      value={local_ovs}
                      onChange={(e) => {
                        setLocalovs(e.target.value);
                        handleErrCheck(e);
                      }}
                      inputProps={{
                        readOnly: !(section === 'VENDOR' && allow),
                      }}
                      error={errorState.local_ovs.stat}
                    >
                      <MenuItem value={'LOCAL'}>Local</MenuItem>
                      <MenuItem value={'OVERSEAS'}>Overseas</MenuItem>
                    </Select>
                    <FormHelperText error={errorState.local_ovs.stat}>
                      {errorState.local_ovs.stat && errorState.local_ovs.message}
                    </FormHelperText>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    id="name_1"
                    label="Company Name"
                    variant="outlined"
                    name="name_1"
                    inputRef={comp_name}
                    error={errorState.name_1.stat}
                    helperText={errorState.name_1.stat && errorState.name_1.message}
                    onChange={handleErrCheck}
                    inputProps={{
                      readOnly: !(section === 'VENDOR' && allow),
                    }}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
          <Accordion expanded={expanded.panelAddr} onChange={handleExpanded('panelAddr')}>
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
              <Typography>Address</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={3}>
                  <FormControl fullWidth>
                    <InputLabel error={errorState.country.stat} id="countrySelectLabel" htmlFor="countrySelect">
                      Country
                    </InputLabel>
                    <Select
                      id="countrySelect"
                      labelId="countrySelectLabel"
                      label="Country"
                      name="country"
                      variant="outlined"
                      value={country_ven}
                      onChange={(e) => {
                        setTimeout(() => {
                          setCountryven(e.target.value);
                        }, 300);
                        handleErrCheck(e);
                      }}
                      inputProps={{
                        readOnly: !(section === 'VENDOR' && allow),
                      }}
                      error={errorState.country.stat}
                    >
                      {countries.map((item, idx) => (
                        <MenuItem key={`${item.country_id}_${idx}`} value={item.country_code}>
                          {item.country_name}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText error={errorState.country.stat}>
                      {errorState.country.stat && errorState.country.message}
                    </FormHelperText>
                  </FormControl>
                </Grid>
                <Grid item xs={9}>
                  <TextField
                    fullWidth
                    id="addressField"
                    label="Address"
                    name="street"
                    inputRef={address}
                    error={errorState.street.stat}
                    helperText={errorState.street.stat && errorState.street.message}
                    onChange={handleErrCheck}
                    inputProps={{
                      readOnly: !(section === 'VENDOR' && allow),
                    }}
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    id="postalCode"
                    label="Postal Code"
                    name="postal"
                    inputRef={postalcode}
                    error={errorState.postal.stat}
                    helperText={errorState.postal.stat && errorState.postal.message}
                    onChange={handleErrCheck}
                    inputProps={{
                      readOnly: !(section === 'VENDOR' && allow),
                    }}
                  />
                </Grid>
                <Grid item xs={3}>
                  {changeCtry ? (
                    <Skeleton animation="pulse" />
                  ) : (
                    <FormControl fullWidth>
                      <InputLabel error={errorState.city.stat} htmlFor="City">
                        City
                      </InputLabel>
                      <Select
                        id="cityField"
                        label="City"
                        labelId="City"
                        variant="outlined"
                        name="city"
                        value={city_ven}
                        onChange={(e) => {
                          setCityven(e.target.value);
                          handleErrCheck(e);
                        }}
                        inputProps={{
                          readOnly: !(section === 'VENDOR' && allow),
                        }}
                        error={errorState.city.stat}
                      >
                        {cities.map((item) => (
                          <MenuItem id={item.code} key={item.code} value={item.city}>
                            {item.city}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText error={errorState.city.stat}>
                        {errorState.city.stat && errorState.city.message}
                      </FormHelperText>
                    </FormControl>
                  )}

                  {/* <TextField fullWidth id="cityField" label="City" /> */}
                </Grid>
                <Grid item xs={6}></Grid>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    id="telf1Field"
                    label="Telephone"
                    name="telf1"
                    inputRef={telf}
                    error={errorState.telf1.stat}
                    helperText={errorState.telf1.stat && errorState.telf1.message}
                    onChange={handleErrCheck}
                    inputProps={{
                      readOnly: !(section === 'VENDOR' && allow),
                    }}
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    id="faxField"
                    label="Fax"
                    name="fax"
                    inputRef={fax}
                    error={errorState.fax.stat}
                    helperText={errorState.fax.stat && errorState.fax.message}
                    onChange={handleErrCheck}
                    inputProps={{
                      readOnly: !(section === 'VENDOR' && allow),
                    }}
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    id="email"
                    label="Email"
                    name="email"
                    inputRef={email_ven}
                    error={errorState.email.stat}
                    helperText={errorState.email.stat && errorState.email.message}
                    onChange={handleErrCheck}
                    inputProps={{
                      readOnly: !(section === 'VENDOR' && allow),
                    }}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
          <Accordion expanded={expanded.panelTax} onChange={handleExpanded('panelTax')}>
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
              <Typography>Tax and Payment</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Checkbox
                          id="is_PKP"
                          checked={is_pkp}
                          onClick={(e) => {
                            if (is_pkp) {
                              setIspkp(false);
                            } else {
                              setIspkp(true);
                            }
                          }}
                          disabled={!(section === 'VENDOR' && allow)}
                        />
                      }
                      label="Pengusaha Kena Pajak (PKP)"
                    />
                  </FormGroup>
                </Grid>
                <Grid item xs={9}></Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    id="taxNumberField"
                    label="Tax Number (NPWP)"
                    name="npwp"
                    inputRef={tax_num}
                    error={errorState.npwp.stat}
                    helperText={errorState.npwp.stat && errorState.npwp.message}
                    onChange={handleErrCheck}
                    inputProps={{
                      readOnly: !(section === 'VENDOR' && allow),
                    }}
                  />
                </Grid>
                <Grid item xs={3}>
                  <FormControl fullWidth>
                    <InputLabel error={errorState.pay_mthd.stat} htmlFor="paymentMethodField">
                      Payment Method
                    </InputLabel>
                    <Select
                      id="paymentMethodLabel"
                      labelId="paymentMethodLabel"
                      variant="outlined"
                      label="Payment Method"
                      name="pay_mthd"
                      value={pay_mthd}
                      onChange={(e) => {
                        setPayMthd(e.target.value);
                        handleErrCheck(e);
                      }}
                      inputProps={{
                        readOnly: !(section === 'VENDOR' && allow),
                      }}
                      error={errorState.pay_mthd.stat}
                    >
                      <MenuItem value={'bank'}>Bank</MenuItem>
                    </Select>
                    <FormHelperText error={errorState.pay_mthd.stat}>
                      {errorState.pay_mthd.stat && errorState.pay_mthd.message}
                    </FormHelperText>
                  </FormControl>
                </Grid>
                <Grid item xs={3}>
                  <FormControl fullWidth>
                    <InputLabel error={errorState.pay_term.stat} htmlFor="paymentTermField">
                      Payment Term
                    </InputLabel>
                    <Select
                      id="paymentTermField"
                      labelId="paymentTermField"
                      label="Payment Term"
                      name="pay_term"
                      variant="outlined"
                      value={pay_term}
                      onChange={(e) => {
                        setPayTerm(e.target.value);
                        handleErrCheck(e);
                      }}
                      inputProps={{
                        readOnly: !(section === 'VENDOR' && allow),
                      }}
                      error={errorState.pay_term.stat}
                    >
                      <MenuItem value={'30'}>30</MenuItem>
                    </Select>
                    <FormHelperText error={errorState.pay_term.stat}>
                      {errorState.pay_term.stat && errorState.pay_term.message}
                    </FormHelperText>
                  </FormControl>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
          {(loader_data.data.cur_pos === 'PROC' || loader_data.data.cur_pos === 'MDM' || seeAll) && (
            <Accordion expanded={expanded.panelVendetail} onChange={handleExpanded('panelVendetail')}>
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
                <Typography>Vendor Details</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={5}>
                    <FormControl fullWidth>
                      <InputLabel id="companyLabel">Company</InputLabel>
                      <Select
                        id="company"
                        labelId="companyLabel"
                        value={comp}
                        label="Company"
                        variant="outlined"
                        name="company"
                        error={errorState.company.stat}
                        onChange={(e) => {
                          setComp(e.target.value);
                          handleErrCheck(e);
                        }}
                        inputProps={{
                          readOnly: !(section === 'VENDOR' && allow),
                        }}
                      >
                        {comps.current?.map((item) => (
                          <MenuItem value={item.comp_id} key={item.id}>
                            {item.code + ' - ' + item.name}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText error={errorState.company.stat}>
                        {errorState.company.stat && errorState.company.message}
                      </FormHelperText>
                    </FormControl>
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      id="purOrg"
                      label="Purchasing Organization"
                      variant="outlined"
                      name="purch_org"
                      error={errorState.purch_org.stat}
                      helperText={errorState.purch_org.stat && errorState.purch_org.message}
                      inputRef={purOrg}
                      onChange={handleErrCheck}
                      inputProps={{
                        readOnly: !(section === 'VENDOR' && allow),
                      }}
                    />
                  </Grid>
                  <Grid item xs={3}></Grid>
                  <Grid item xs={3}>
                    <FormControl fullWidth>
                      <InputLabel id="venGroup_label">Vendor Group</InputLabel>
                      <Select
                        id="vengroup"
                        labelId="venGroup_label"
                        value={venGroup}
                        label="Vendor Group"
                        variant="outlined"
                        name="ven_group"
                        onChange={(e) => {
                          setVengroup(e.target.value);
                          handleErrCheck(e);
                        }}
                        error={errorState.ven_group.stat}
                        inputProps={{
                          readOnly: !(section === 'VENDOR' && allow),
                        }}
                      >
                        <MenuItem value={'3RD_PARTY'}>3RD Party</MenuItem>
                        <MenuItem value={'INTERCO'}>Interco</MenuItem>
                        <MenuItem value={'BANK'}>Bank</MenuItem>
                        <MenuItem value={'SHAREHOLDERS'}>Shareholders</MenuItem>
                        <MenuItem value={'EMPLOYEE'}>Employee</MenuItem>
                        <MenuItem value={'INTERDIVISION'}>Interdivision</MenuItem>
                        <MenuItem value={'RELATED'}>Related</MenuItem>
                      </Select>
                      <FormHelperText error={errorState.ven_group.stat}>
                        {errorState.ven_group.stat && errorState.ven_group.message}
                      </FormHelperText>
                    </FormControl>
                  </Grid>
                  <Grid item xs={3}>
                    <FormControl fullWidth>
                      <InputLabel id="venacc_label">Vendor Account</InputLabel>
                      <Select
                        id="venacc"
                        labelId="venacc_label"
                        value={venAcc}
                        label="Vendor Accout"
                        variant="outlined"
                        name="ven_acc"
                        onChange={(e) => {
                          setVenacc(e.target.value);
                          handleErrCheck(e);
                        }}
                        inputProps={{
                          readOnly: !(section === 'VENDOR' && allow),
                        }}
                        error={errorState.ven_acc.stat}
                      >
                        <MenuItem value={'TRADE'}>Trade</MenuItem>
                        <MenuItem value={'NON_TRADE'}>Non-Trade</MenuItem>
                      </Select>
                      <FormHelperText error={errorState.ven_acc.stat}>
                        {errorState.ven_acc.stat && errorState.ven_acc.message}
                      </FormHelperText>
                    </FormControl>
                  </Grid>
                  <Grid item xs={3}>
                    <FormControl fullWidth>
                      <InputLabel id="ventype_label">Vendor Type</InputLabel>
                      <Select
                        id="ventype"
                        labelId="ventype_label"
                        value={venType}
                        label="Vendor Type"
                        variant="outlined"
                        name="ven_type"
                        onChange={(e) => {
                          setVentype(e.target.value);
                          handleErrCheck(e);
                        }}
                        inputProps={{
                          readOnly: !(section === 'VENDOR' && allow),
                        }}
                        error={errorState.ven_type.stat}
                      >
                        <MenuItem value={'X'}>X</MenuItem>
                        {(venAcc === 'NON_TRADE' || venAcc === '') &&
                          ventypeList[venGroup]?.map((item) => <MenuItem value={item[0]}>{item[1]}</MenuItem>)}
                        {/* <MenuItem value={'MATERIAL'}>Material</MenuItem>
                          <MenuItem value={'TRANSPORTER'}>Transporter</MenuItem>
                          <MenuItem value={'CONTRACTOR'}>Contractor</MenuItem>
                          <MenuItem value={'INSURANCE'}>Insurance</MenuItem>
                          <MenuItem value={'ONE_TIME'}>One Time</MenuItem>
                          <MenuItem value={'OTHER'}>Other</MenuItem> */}
                      </Select>
                      <FormHelperText error={errorState.ven_type.stat}>
                        {errorState.ven_type.stat && errorState.ven_type.message}
                      </FormHelperText>
                    </FormControl>
                  </Grid>
                  <Grid item xs={3}></Grid>
                  <Grid item xs={3}>
                    <FormControl fullWidth>
                      <InputLabel error={errorState.lim_curr.stat} id="limCurrLabel">
                        Limit Currency
                      </InputLabel>
                      <Select
                        id="limCurr"
                        labelId="limCurrLabel"
                        value={lim_curr}
                        label="Limit Currency"
                        variant="outlined"
                        name="lim_curr"
                        onChange={(e) => {
                          setLimitCurr(e.target.value);
                          handleErrCheck(e);
                        }}
                        inputProps={{
                          readOnly: !(section === 'VENDOR' && allow),
                        }}
                        error={errorState.lim_curr.stat}
                      >
                        {Object.keys(currencies).map((id) => (
                          <MenuItem id={id} value={id} key={id}>
                            {currencies[id]}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText error={errorState.lim_curr.stat}>
                        {errorState.lim_curr.stat && errorState.lim_curr.message}
                      </FormHelperText>
                    </FormControl>
                  </Grid>
                  <Grid item xs={4}>
                    <NumericFormat
                      value={lim_ven}
                      prefix={currencies[lim_curr] + ' '}
                      thousandSeparator
                      customInput={TextField}
                      label={'Limit Vendor'}
                      fullWidth
                      name="limit_vendor"
                      onChange={(e) => {
                        setTimeout(() => {
                          setLimven(e.target.value.replace(`-?\\d+(\\.\\d+)?`, ''));
                          handleErrCheck(e);
                        }, 1000);
                      }}
                      inputProps={{
                        readOnly: !(section === 'VENDOR' && allow),
                      }}
                      error={errorState.limit_vendor.stat}
                      helpertext={errorState.limit_vendor.message}
                    />
                  </Grid>
                  <Grid item xs={10}></Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="ven_desc"
                      label="Description"
                      variant="outlined"
                      name="ven_desc"
                      inputRef={ven_desc}
                      multiline
                      inputProps={{
                        readOnly: !(section === 'VENDOR' && allow),
                      }}
                    />
                  </Grid>
                  <Grid item xs={5}>
                    <FormGroup>
                      <FormControlLabel
                        control={
                          <Checkbox
                            id="is_tender"
                            checked={is_tender}
                            onClick={(e) => {
                              if (is_tender) {
                                setIstender(false);
                              } else {
                                setIstender(true);
                              }
                            }}
                            disabled={!(section === 'VENDOR' && allow)}
                          />
                        }
                        label="Tender participation above one billion"
                      />
                    </FormGroup>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          )}
          <Accordion expanded={expanded.panelBank} onChange={handleExpanded('panelBank')}>
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
              <Typography>Bank Information</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <VenBankTable
                onChildDataChange={setVen_bankFromChild}
                initData={initDataBank.current ? initDataBank.current : {}}
                idParent={initialForm.current.ven_id}
                banks={banks.current}
                isallow={allow && section === 'VENDOR'}
              />
            </AccordionDetails>
          </Accordion>
          <Accordion expanded={expanded.panelFile} onChange={handleExpanded('panelFile')}>
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
              <Typography>File Upload</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <UploadButton
                inputTypes={[
                  { key: 'SPPKP', value: 'SPPKP' },
                  { key: 'KTP', value: 'KTP' },
                ]}
                iniData={initDataFile.current ? initDataFile.current : {}}
                idParent={initialForm.current.ven_id}
                allow={allow}
                onChildDataChange={setVen_fileFromChild}
              />
            </AccordionDetails>
          </Accordion>
          {(loader_data.data.cur_pos == 'MDM' || seeAll) && (
            <Accordion expanded={expanded.panelApproval} onChange={handleExpanded('panelApproval')}>
              <AccordionSummary
                sx={{ pointerEvents: 'none' }}
                expandIcon={<ExpandMoreIcon sx={{ pointerEvents: 'auto' }} />}
              >
                <Typography>Approval</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="Vendor Code"
                      id="ven_code"
                      name="ven_code"
                      inputRef={ven_code}
                      fullWidth
                      error={errorState.ven_code.stat}
                      helperText={errorState.ven_code.stat && errorState.ven_code.message}
                      inputProps={{
                        readOnly: !(section === 'MDM' && allow),
                      }}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          )}
          {(loader_data.data.remarks !== null || loader_data.data.cur_pos !== 'VENDOR' || seeAll) && (
            <Box sx={{ my: 5 }}>
              <TextField
                label="Remarks"
                id="remarks"
                name="remarks"
                inputRef={remarks}
                fullWidth
                multiline
                inputProps={{ readOnly: loader_data.data.cur_pos === 'VENDOR' }}
              />
              <Link href={`${process.env.REACT_APP_URL_LOC}/file/Kode_Etik_Supplier_Vendor_dan_Kontraktor.doc`}>
                File Pakta Integritas
              </Link>
            </Box>
          )}
          {/* <Box fullWidth sx={{ my: 5 }}>
              <TextField label="Remarks" id="remarks" name="remarks" inputRef={remarks} fullWidth multiline />
            </Box> */}
          {loader_data.data.cur_pos === 'VENDOR' && (
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
              <Button sx={{ height: 50, width: 100, margin: 2 }} variant="contained" onClick={handleSubmit(false)}>
                Submit
              </Button>
            </Box>
          )}
          {loader_data.data.cur_pos === (loader_data.role != '' ? loader_data.role : session.role) &&
            (loader_data.data.cur_pos === 'PROC' || loader_data.data.cur_pos === 'MDM') && (
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Button sx={{ height: 50, width: 100, margin: 2 }} color="error" variant="text">
                    Cancel
                  </Button>
                </Box>
                <Box>
                  <Button
                    sx={{ height: 50, width: 100, margin: 2 }}
                    color="error"
                    variant="contained"
                    onClick={handleReject}
                  >
                    Reject
                  </Button>
                  <Button
                    sx={{ height: 50, width: 120, margin: 2 }}
                    color="warning"
                    variant="contained"
                    onClick={handleSubmit(true)}
                  >
                    Save Draft
                  </Button>
                  <Button sx={{ height: 50, width: 100, margin: 2 }} variant="contained" onClick={handleSubmit(false)}>
                    Submit
                  </Button>
                </Box>
              </Box>
            )}
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
          open={!allow && loader_data.role === 'VENDOR'}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert severity="success" variant="filled">
            {`Ticket Number ${loader_data.data.ticket_num} has already submitted`}
          </Alert>
        </Snackbar>
        <Backdrop
          sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer - 2 }}
          open={!(refLoad && stateLoad && fileLoad && bankLoad && banksLoad && currLoad && countryLoad) || loader}
        >
          <CircularProgress color="inherit" />
        </Backdrop>
        <Dialog open={formStat.type === 'success' && !isDraft}>
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
      </Container>
    </>
  );
}
