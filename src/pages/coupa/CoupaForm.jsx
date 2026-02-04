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
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import useSessionStore from "src/store/useSessionStore";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import UploadButton from "src/components/common/UploadButton";
import { useNavigate, useParams } from "react-router-dom";
import axios, { isAxiosError } from "axios";
import { TextFieldComp } from "src/components/common/TextFieldComp";
import SwitchComponent from "src/components/common/SwitchComponent";
import SelectComp from "src/components/common/SelectComp";
import CheckboxComp from "src/components/common/CheckboxComp";
import NumericFieldComp from "src/components/common/NumericFieldComp";
import { useForm, useFormState, useFieldArray } from "react-hook-form";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import PatternFieldComp from "src/components/common/PatternFieldComp";
import AutoCompleteSelect from "src/components/common/AutoCompleteSelect";
import { LoadingButton } from "@mui/lab";
import ConfirmComponent from "src/components/common/ConfirmComponent";
import { useTranslation } from "react-i18next";
import { useTheme } from "@mui/material/styles";
import AutoSelectPurOrg from "src/components/common/AutoSelectPurOrg";
import { v4 } from "uuid";
import useTogglePanel, { FormTab } from "src/hooks/useTogglePanel";

import RejectLog from "src/components/common/RejectLog";
import VenBankTableRefactor from "src/components/FormVendor/VenBankTableRefactor";
import VenBankTableCoupa from "./VenBankTableCoupa";
import usePermissionStore from "src/store/userPermissionStore";
import { useFormCoupa } from "./DirectCoupaForm";

const ventypeList = {
  "3RD_PARTY": [
    { value: "MATERIAL", label: "Material" },
    { value: "CONTRACTOR", label: "Contractor" },
    { value: "INSURANCE", label: "Insurance" },
    { value: "ONE_TIME", label: "One Time" },
    { value: "TRANSPORTER", label: "Transporter" },
    { value: "OTHER", label: "Other" },
  ],
  INTERCO: [
    { value: "MATERIAL", label: "Material" },
    { value: "CONTRACTOR", label: "Contractor" },
    { value: "INSURANCE", label: "Insurance" },
    { value: "TRANSPORTER", label: "Transporter" },
  ],
  BANK: [{ value: "X", label: "X" }],
  SHAREHOLDERS: [{ value: "X", label: "X" }],
};

function CoupaForm() {
  const { formData: data_form, coupa_id } = useFormCoupa();
  const theme = useTheme();
  const user_id = useSessionStore(state => state.user_id);
  const role = useSessionStore(state => state.role);
  const emp_role_id = useSessionStore(state => state.emp_role_id);
  const bu_id = useSessionStore(state => state.bu_id);
  const dept_id = useSessionStore(state => state.dept_id);
  const axiosPrivate = useAxiosPrivate();
  const [field_rule, setFieldRule] = useState({
    condition: "enabled",
    fields: [],
  });
  //reducerFunction
  const { expanded, toggle } = useTogglePanel();

  const defaultValue = {
    emailRequestor: "",
    deptRequestor: "",
    titlecomp: "",
    localovs: "",
    name1: "",
    kawasan_berikat: false,
    id_coupa: "",
    country: "",
    street: "",
    street2: "",
    street3: "",
    street4: "",
    postal: "",
    city: "",
    telf: "",
    fax: "",
    email: "",
    street_npwp: "",
    street2_npwp: "",
    street3_npwp: "",
    street4_npwp: "",
    postal_npwp: "",
    city_npwp: "",
    street_sppkp: "",
    street2_sppkp: "",
    street3_sppkp: "",
    street4_sppkp: "",
    postal_sppkp: "",
    city_sppkp: "",
    ispkp: false,
    is_new_npwp: false,
    npwp: "",
    paymthd: "",
    payterm: "",
    company: "",
    purchorg: null,
    vengroup: "",
    venacc: "",
    ventype: "",
    currency: "",
    description: "",
    is_tender: false,
    is_priority: false,
    is_interest: false,
    vendorcode: "",
    ppn_type: "VAT_11",
    nitku: "",
    remarks_disabled: "",
    limit: "",
    search_term: "",
    website_url: "",
    ig_link: "",
    fb_link: "",
    twt_link: "",
    nama_direktur: "",
    nama_pic: "",
    no_telf_pic: "",
    email_pic: "",
    email_fin: "",
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
  } = useForm({ defaultValues: defaultValue, mode: "onChange" });

  const { fields, append, remove } = useFieldArray({
    control: control,
    name: "bank",
    rules: { required: true },
  });

  const { dirtyFields } = useFormState({ control: control });

  const [loader_data, setLoaderdata] = useState({
    ticket_id: "",
    ticket_num: "",
    ticket_type: "",
    ven_id: "",
    ticketState: "",
    data: "",
    permission: "",
    cur_pos: "",
    proc_id: "",
    approval_pos: null,
    logrej_counter: null,
  });

  const checkFieldRule = useCallback(
    field_name => {
      let is_exist = true;
      if (field_rule.fields[0] == "all" || emp_role_id == "ADMIN") {
        is_exist = true;
      } else if (field_name == "vendetail" && data_form.emp_role_id !== "VENDOR") {
        if (field_rule.condition == "disabled") {
          is_exist = false;
        } else {
          is_exist = true;
        }
      } else if (data_form?.proc_id != user_id && data_form?.cur_pos == "STAFF") {
        is_exist = false;
      } else {
        is_exist = field_rule.fields.includes(field_name);
      }
      if (field_rule.condition == "enabled" || emp_role_id == "ADMIN") {
        return !is_exist;
      } else {
        return is_exist;
      }
    },
    [field_rule.fields, emp_role_id, data_form, user_id]
  );

  useEffect(() => {
    if (Object.keys(data_form).length == 0) {
      return;
    }
    const data = data_form;
    const controller = new AbortController();
    (async () => {
      //set fields permission
      if (
        (emp_role_id == data.emp_role_id && bu_id == data.bu_id && dept_id == data.dept_id) ||
        (emp_role_id == "" && data.emp_role_id == "VENDOR")
      ) {
        if (data.enabled_input && data.enabled_input.length > 0) {
          setFieldRule({
            condition: "enabled",
            fields: data.enabled_input,
          });
        } else if (data.disabled_input && data.disabled_input.length > 0) {
          setFieldRule({
            condition: "disabled",
            fields: data.disabled_input,
          });
        }
      }

      const compsData = await axiosPrivate.get(`/master/company`, {
        signal: controller.signal,
      });
      const response = compsData.data.data;
      comps.current = response.data;

      const upstream = comps.current["UPSTREAM"].map(item => ({
        name: item.name,
        code: item.code,
        comp_id: item.comp_id,
      }));

      const downstream = comps.current["DOWNSTREAM"].map(item => ({
        name: item.name,
        code: item.code,
        comp_id: item.comp_id,
      }));

      comps.current = upstream.concat(downstream);

      console.log("ini ben", comps.current);

      const company_code = data.vendor_detail.company_code
        ? data.vendor_detail.company_code.length > 2
          ? data.vendor_detail.company_code.slice(0, 2)
          : data.vendor_detail.company_code
        : "";
      console.log(company_code);

      const selectedCompany = comps.current.find(c => c.code === company_code);

      const valueForm = {
        emailRequestor: data.email_proc ? data.email_proc : "",
        deptRequestor: data.dep_proc ? data.dep_proc : "",
        titlecomp: data.company.title.toUpperCase() == "PERUSAHAAN" ? "COMPANY" : "PERSONAL",
        localovs: data.company.local_ovs.toLowerCase() == "local" ? "LOCAL" : "OVS",
        name1: data.company["name_1"] ? data.company["name_1"] : "",
        kawasan_berikat: data?.company.kawasan_berikat,
        country: data.company.country_code ? data.company.country_code : "",
        street: data.company_address.street1 ?? "",
        street2: data.company_address.street2 ?? "",
        street3: data.company_address.street3 ?? "",
        street4: data.company_address.street4 ?? "",
        postal: data.company_address.postal ?? "0",
        city: data.company_address.city ?? "",
        street_sppkp: data.sppkp_address.sppkp_street1 ?? "",
        street2_sppkp: data.sppkp_address.sppkp_street2 ?? "",
        street3_sppkp: data.sppkp_address.sppkp_street3 ?? "",
        street4_sppkp: data.sppkp_address.sppkp_street4 ?? "",
        postal_sppkp: data.sppkp_address.postal_sppkp ?? "0",
        city_sppkp: data.sppkp_address.city_sppkp ?? "",
        street_npwp: data.npwp_address.npwp_street1 ?? "",
        street2_npwp: data.npwp_address.npwp_street2 ?? "",
        street3_npwp: data.npwp_address.npwp_street3 ?? "",
        street4_npwp: data.npwp_address.npwp_street4 ?? "",
        postal_npwp: data.npwp_address.postal_npwp ?? "0",
        city_npwp: data.npwp_address.city_npwp ?? "",
        telf: data.company.phone ? data.company.phone : "",
        fax: data.company.fax ? data.company.fax : "",
        email: data.company.email ? data.company.email : "",
        ispkp: data.tax_payment.is_pkp ?? false,
        is_new_npwp: data.tax_payment.is_new_npwp ?? false,
        npwp: data.tax_payment.npwp ? data.tax_payment.npwp : "",
        paymthd: data.tax_payment.pay_mthd.toLowerCase() ?? "",
        payterm: data.tax_payment.pay_term_code ? data.tax_payment.pay_term_code : "I30",
        ppn_type: data.tax_payment.ppn_code ?? "",
        company: selectedCompany ? selectedCompany.comp_id : "",
        purchorg: data.vendor_detail.purch_org
          ? { value: data.vendor_detail.purch_org_code, label: data.vendor_detail.purch_org }
          : null,
        vengroup: data.vendor_detail.ven_group ? data.vendor_detail.ven_group : "",
        venacc: data.vendor_detail.ven_acc ? data.vendor_detail.ven_acc : "",
        ventype: data.vendor_detail.ven_type ? data.vendor_detail.ven_type.toUpperCase() : "",
        currency: data.vendor_detail.lim_curr ? data.vendor_detail.lim_curr : "",
        description: data.vendor_detail.description ? data.vendor_detail.description : "",
        is_tender: data.vendor_detail.is_tender ? data.vendor_detail.is_tender : false,
        is_priority: data.vendor_detail.is_priority ? data.vendor_detail.is_priority : false,
        is_interest: data.vendor_detail.is_interest ? data.vendor_detail.is_interest : false,
        vendorcode: data.ven_code ? data.ven_code : data.header,
        id_coupa: coupa_id ?? "",
        nitku: data.tax_payment.nitku ?? "",
        limit: data.limit_vendor ? data.limit_vendor : 0,
        search_term: data.search_term ? data.search_term : "",
        is_active: data.ticket_stat,
        website_url: data.social_media.website_url ?? "",
        ig_link: data.social_media.ig_link ?? "",
        fb_link: data.social_media.fb_link ?? "",
        twt_link: data.social_media.twt_link ?? "",
        nama_direktur: data.company_organization.nama_direktur ?? "",
        nama_pic: data.company_organization.nama_pic ?? "",
        no_telf_pic: data.company_organization.no_telf_pic ?? "",
        email_pic: data.company_organization.email_pic ?? "",
        email_fin: data.company_organization.email_finance ?? "",
        bank: Array.isArray(data.bank_information)
          ? data.bank_information.map(bank => ({
              bank_country: bank.bank_country
                ? { value: bank.bank_country, label: bank.bank_country }
                : null,

              bank_id: bank.bank_key ? { value: bank.bank_key, label: bank.bank_name } : null,

              bank_curr: bank.bank_curr ? { value: bank.bank_curr, label: bank.bank_curr } : null,

              bank_acc: bank.bank_acc ?? "",
              acc_hold: bank.acc_hold ?? "",
            }))
          : [],
      };

      if (valueForm.name1 === "") {
        setCheckex(true);
        toggle({ type: FormTab.RestrictForm });
      } else {
        setBtnclick(false);
        setCheckex(false);
        toggle({ type: FormTab.OpenForm });
      }

      setLoaderdata({
        ticket_id: data.ticket_id,
        ticket_num: data.ticket_num,
        ven_id: data.ven_id === null ? data.ticket_ven_id : data.ven_id,
        ticketState: data.ticket_state,
        ticket_type: data.approval_type,
        data: valueForm,
        cur_pos: data.cur_pos,
        approval_pos: data.approval_pos,
        logrej_counter: data.counter,
      });
      setChgComp(data.company || null);
    })();

    return () => {
      controller.abort();
    };
  }, [emp_role_id, data_form]);
  const [chgComp, setChgComp] = useState();
  const [chgCountry, setChgCty] = useState(loader_data.data?.country);
  const [chgVengrp, setVengrp] = useState(loader_data.data?.vengroup);
  const [chgVenacc, setVenacc] = useState(loader_data.data?.venacc);
  const [chgCurr, setChgCurr] = useState(loader_data.data?.currency);
  const [phoneNumber, setPhnNum] = useState("+XX");
  const [chgIsPTKP, setIsPTKP] = useState(false);
  const [chgLocal, setLocal] = useState("");
  const [compTitle, setComptitle] = useState(loader_data.data?.titlecomp);
  const [compName, setCompname] = useState();
  const [checkIsExist, setCheckex] = useState(true);
  const [openAlert, setOpenAlert] = useState(false);
  const [isTender, setTender] = useState(loader_data.data?.is_tender);
  const [btnClicked, setBtnclick] = useState(true);
  const [modalRejectopen, setModalopen] = useState(false);
  const [modalConfirmopen, setConfOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(false);
  const [loadAddBank, setLoadAddBnk] = useState(false);
  const [langCode, setLang] = useState("id");
  const { t, i18n } = useTranslation("translation", { lng: langCode });
  const [initDataFile, setInitDfile] = useState([]);
  const fileCheck = useMemo(() => getValues("file_atth"), [watch("file_atth")]);
  // const updateCurrentEdit = (rows) => {
  //   setCurrentEdit(rows);
  // };
  const funChgCountry = useCallback(item => {
    setChgCty(item);
    countrycode.current = item;
  }, []);
  const funChgVgrp = useCallback(item => {
    setVengrp(item);
  }, []);
  const funChgVacc = useCallback(item => {
    setVenacc(item);
    if (item !== "TRADE") {
      clearErrors("currency");
      clearErrors("limit");
    }
  }, []);

  const funChgCurr = useCallback(item => {
    setChgCurr(item);
  }, []);

  const funChgLoc = useCallback(item => {
    if (item === "LOCAL") {
      setChgCty("ID");
      setValue("country", "ID");
    }
    setLocal(item);
  }, []);

  const funChgTdr = useCallback(item => {
    onLoad.current = true;
    setTender(item);
    if (!item) {
      clearErrors("description");
    }
  }, []);

  const funChgTitle = useCallback(item => {
    setComptitle(item);
  }, []);

  const funChgname = useCallback(
    item => {
      if (item != compName && item !== "") {
        setCheckex(true);
        toggle({ type: FormTab.RestrictForm });
        setBtnclick(true);
        setCompname(item);
      } else if (item == compName && item !== "") {
        setCheckex(false);
        toggle({ type: FormTab.OpenForm });
        setBtnclick(false);
      } else {
        setCheckex(true);
        toggle({ type: FormTab.RestrictForm });
        setBtnclick(true);
        setCompname(item);
      }
    },
    [compName]
  );

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

  const navigate = useNavigate();
  const ticketState = useMemo(() => loader_data?.ticketState, [loader_data]);
  const countrycode = useRef(loader_data.data?.country);

  const countries = useRef([{ value: "", label: "" }]);
  const [currencies, setCurr] = useState([]);
  const allCurr = useRef([]);
  const banks = useRef([{ value: "", label: "" }]);
  const payterm = useRef([{ value: "", label: "" }]);
  const comps = useRef([{ value: "", label: "" }]);
  const ppn_type = useRef([{ value: "", label: "" }]);

  const onLoad = useRef(false);

  const [cities, setCities] = useState([{ value: "", label: "" }]);
  const [loading, setLoading] = useState(false);
  const [loadingEx, setLoadex] = useState(false);
  const is_draft = useRef(false);

  const [loadingInitFile, setLoadInitFile] = useState(false);

  const vengroups = [
    { value: "3RD_PARTY", label: "3RD Party" },
    { value: "BANK", label: "Bank" },
    { value: "SHAREHOLDERS", label: "Shareholders" },
    { value: "INTERCO", label: "Interco" },
  ];

  const title = [
    { value: "COMPANY", label: t("Company") },
    { value: "PERSONAL", label: "PERSONAL" },
  ];

  const localoverseas = [
    { value: "LOCAL", label: t("Local") },
    {
      value: "OVS",
      label: t("Overseas"),
    },
  ];

  const [formStat, setFormStat] = useState({
    stat: false,
    type: "info",
    message: "",
  });
  const [ven_file, setVen_file] = useState([]);
  useMemo(() => ({ cities, countries, currencies }), [cities, countries, currencies]);

  const getInitDataFile = useCallback(
    async controller => {
      setLoadInitFile(true);
      try {
        const fileInit = await axiosPrivate.get(`/vendor/file/${loader_data.ven_id}`, {
          signal: controller.signal,
        });
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
        const convcity = result.data.map(item => ({
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
        const { data: phoneNum } = await axiosPrivate.get("/master/phonecode?id=" + chgCountry);
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
      setCurr(
        allCurr.current.filter(
          item => (chgLocal === "LOCAL" && item.nation === "ID") || chgLocal === "OVS"
        )
      );
    }
  }, [chgLocal, allCurr.current]);

  useEffect(() => {
    setLoading(true);
    const controller = new AbortController();
    const dynaCountry = async () => {
      try {
        const country = await axiosPrivate.post(
          `/master/country`,
          {},
          {
            signal: controller.signal,
          }
        );
        const result = country.data.data;
        countries.current = result.data.map(item => ({
          value: item.country_code,
          label: item.country_name,
        }));
      } catch (err) {
        console.error(err);
        // alert(err.stack);
      }
    };

    const getCurr = async () => {
      try {
        const curr = await axiosPrivate.get(`/master/curr`, {
          signal: controller.signal,
        });
        const response = curr.data;
        const result = response.data;
        setCurr(
          result.data.map(item => ({
            value: item.code === null ? "" : item.code,
            label: item.code === null ? "" : item.code,
            nation: item.nation,
          }))
        );
        allCurr.current = result.data.map(item => ({
          value: item.code === null ? "" : item.code,
          label: item.code === null ? "" : item.code,
          nation: item.nation,
        }));
      } catch (err) {
        console.error(err);
        // alert(err.stack);
      }
    };

    const getBanks = async () => {
      try {
        const banksData = await axiosPrivate.get(`/master/banksap`, {
          params: {
            country: data_form.bank_information.bank_country,
          },
          signal: controller.signal,
        });
        const response = banksData.data;
        const result = response.data;
        banks.current = result;
      } catch (error) {
        console.log(error);
        // alert(error.stack);
      }
    };

    const getCompany = async () => {
      try {
        const compsData = await axiosPrivate.get(`/master/company`, {
          signal: controller.signal,
        });
        const response = compsData.data;
        const result = response.data;
        comps.current = result.data;
      } catch (error) {
        console.error(error);
      }
    };

    const getPayterm = async () => {
      try {
        const paytermData = await axiosPrivate.get(`/master/payterm`, {
          signal: controller.signal,
        });
        const data = paytermData.data.data;
        payterm.current = data.map(item => ({
          value: item.term_code,
          label: `${item.term_code}-${item.term_name}`,
        }));
      } catch (error) {
        console.error(error);
        // alert(error.stack);
      }
    };

    const getPPNType = async () => {
      try {
        const { data } = await axiosPrivate.get(`/master/getvat`);
        const data_vat = data.data;
        ppn_type.current = data_vat.map(item => ({ value: item.ppn_code, label: item.ppn_desc }));
      } catch (error) {
        console.error(error);
      }
    };

    if (loader_data.ven_id !== "") {
      (async () => {
        setLoading(true);
        await dynaCountry();
        await getCurr();
        await getBanks();
        // await getInitDataBank(controller);
        await getInitDataFile(controller);
        await getCompany();
        await getPayterm();
        await getPPNType();
        setLoading(false);
      })();
    }
    return () => {
      controller.abort();
    };
  }, [loader_data]);

  const handleSnackClose = useCallback((e, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setFormStat({ ...formStat, stat: false });
  }, []);

  const changeLang = useCallback((e, value) => {
    setLang(value);
    i18n.changeLanguage(value);
  }, []);

  const submitForm = async value => {
    // setBtnclick(true);
    const controller = new AbortController();
    const filteredVenFile = ven_file.filter(item => item.method !== "");
    const ven_detail = {
      ven_id: loader_data.ven_id ?? "",
      ticket_num: loader_data.ticket_num ?? "",
      title: value.titlecomp ?? "",
      name_1: value.name1 ?? "",
      local_ovs: value.localovs ?? "",
      postal: value.postal.trim() ?? "",
      country: value.country,
      city: typeof value.city === "object" ? value.city.value : value.city,
      street: value.street ?? "",
      street2: value.street2 ?? "",
      street3: value.street3 ?? "",
      street4: value.street4 ?? "",
      postal_npwp: value.postal_npwp.trim() ?? "",
      city_npwp: typeof value.city_npwp === "object" ? value.city_npwp.value : value.city_npwp,
      street_npwp: value.street_npwp ?? "",
      street2_npwp: value.street2_npwp ?? "",
      street3_npwp: value.street3_npwp ?? "",
      street4_npwp: value.street4_npwp ?? "",
      postal_sppkp: value.postal_sppkp.trim() ?? "",
      city_sppkp: typeof value.city_sppkp === "object" ? value.city_sppkp.value : value.city_sppkp,
      street_sppkp: value.street_sppkp ?? "",
      street2_sppkp: value.street2_sppkp ?? "",
      street3_sppkp: value.street3_sppkp ?? "",
      street4_sppkp: value.street4_sppkp ?? "",
      telf1: value.telf.trim().split(/-/)[1] ?? "",
      fax: value.fax.trim().split(/-/)[1] ?? "",
      email: value.email ?? "",
      is_new_npwp: value.is_new_npwp,
      is_pkp: value.ispkp,
      is_tender: value.is_tender,
      is_priority: value.is_priority,
      is_interest: value.is_interest,
      npwp: value.npwp.trim() ?? "",
      pay_mthd: value.paymthd ?? "",
      pay_term: value.payterm ?? "",
      ppn_type: value.ppn_type ?? "",
      company: value.company ?? "",
      purch_org: value.purchorg?.value ?? "",
      ven_acc: value.venacc ?? "",
      ven_group: value.vengroup ?? "",
      ven_type: value.ventype ?? "",
      description: value.description ?? "",
      limit_vendor: 0,
      lim_curr: value.currency ?? "",
      ven_code: value.vendorcode ?? "",
      search_term: value.search_term ?? "",
      website_url: value.website_url.trim() ?? "",
      ig_link: value.ig_link.trim() ?? "",
      fb_link: value.fb_link.trim() ?? "",
      twt_link: value.twt_link.trim() ?? "",
      nama_direktur: value.nama_direktur.trim() ?? "",
      nama_pic: value.nama_pic.trim() ?? "",
      no_telf_pic: value.no_telf_pic.trim().split(/-/)[1] ?? "",
      email_pic: value.email_pic.trim() ?? "",
      email_fin: value.email_fin.trim() ?? "",
      kawasan_berikat: value.kawasan_berikat ?? "",
      nitku: value.nitku ?? "",
      coupa_id: value.id_coupa ?? "",
    };

    const ven_bank = (value.bank ?? []).map(bank => ({
      ...bank,
      bank_country: bank.bank_country?.value,
      bank_curr: bank.bank_curr?.value,
      bank_id: bank.bank_id?.value,
      method: "insert",
    }));

    const jsonSend = {
      ticket_state: ticketState ?? "",
      ven_detail: ven_detail,
      ven_banks: ven_bank,
    };

    console.log(jsonSend);
    try {
      setLoading(true);
      let submit;

      submit = await axiosPrivate.post(`/coupa/vendor/submit`, jsonSend);
      const response = submit.data;
      console.log(response);
      if (response) {
        const submitSAP = 0;
      }
      setFormStat({ stat: true, type: "success", message: response.message });
      if (!is_draft.current) {
        setTimeout(() => {
          if (data_form.emp_role_id == "VENDOR") {
            navigate(0);
          } else {
            navigate("../../dashboard/coupa");
          }
        }, 3000);
        // console.log('reloading...');
      } else {
        // getInitDataBank(controller);
        getInitDataFile(controller);
      }
    } catch (err) {
      console.log(err.stack);
      if (isAxiosError(err)) {
        setFormStat({ stat: true, type: "error", message: err.response.data.message });
      } else {
        setFormStat({ stat: true, type: "error", message: "error submitting" });
      }
      // alert(err.stack);
    } finally {
      setLoading(false);
      setBtnclick(false);
    }
  };

  useEffect(() => {
    resetField("limit");
    resetField("currency");
  }, [chgVenacc]);

  return (
    <>
      <Container maxWidth="xl">
        <Box
          sx={{
            height: 120,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Typography variant="h4" gutterBottom>
            {`Form Vendor Registration ${coupa_id}`}
          </Typography>
        </Box>
        <Container>
          <form key={1} onSubmit={handleSubmit(submitForm)}>
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <ToggleButtonGroup value={langCode} onChange={changeLang} exclusive>
                <ToggleButton value="id">ID</ToggleButton>
                <ToggleButton value="en">EN</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Accordion
              expanded={expanded.panelCompDet}
              onChange={e => {
                toggle({ type: FormTab.CompDet });
              }}
              TransitionProps={{ unmountOnExit: true }}
            >
              <AccordionSummary
                sx={{
                  pointerEvents: "none",
                }}
                expandIcon={
                  <ExpandMoreIcon
                    sx={{
                      pointerEvents: "auto",
                    }}
                  />
                }
                id="panelCompDet"
              >
                <Typography>{t("Company Details")}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <SelectComp
                      name="titlecomp"
                      label={t("Title") + " *"}
                      control={control}
                      t={t}
                      disabled={true}
                      onChangeovr={funChgTitle}
                      options={title}
                      rules={{ required: "Please insert this field" }}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <SelectComp
                      name="localovs"
                      label={t("Local/Overseas") + " *"}
                      t={t}
                      control={control}
                      disabled={true}
                      options={localoverseas}
                      rules={{ required: "Please insert this field" }}
                      onChangeovr={funChgLoc}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <SelectComp
                      name="country"
                      label={t("Country") + " *"}
                      t={t}
                      control={control}
                      disabled={true}
                      options={countries.current}
                      onChangeovr={funChgCountry}
                      rules={{
                        required: "Please insert this field",
                      }}
                    />
                  </Grid>
                  <Grid item xs={8}>
                    <TextFieldComp
                      name="name1"
                      label={t("Company Name") + " *"}
                      control={control}
                      disabled={true}
                      t={t}
                      rules={{
                        required: "Please insert this field",
                        maxLength: { value: 35, message: "Max 35 Character" },
                      }}
                      onChangeovr={funChgname}
                      toUpperCase={true}
                      sx={{ minWidth: "30rem" }}
                      regex={{ rule: /,+/g, value: "" }}
                    />
                  </Grid>

                  <Grid item xs={4}>
                    <PatternFieldComp
                      name="telf"
                      label={t("Telephone Number")}
                      useplaceholder
                      control={control}
                      disabled={true}
                      format={phoneNumber}
                      isNumString={false}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <PatternFieldComp
                      name="fax"
                      label={t("Handphone Number")}
                      useplaceholder
                      control={control}
                      disabled={true}
                      format={phoneNumber}
                      isNumString={false}
                    />
                  </Grid>
                  <Grid item xs={8}>
                    <TextFieldComp
                      name="email"
                      label="Email *"
                      control={control}
                      t={t}
                      disabled={true}
                      toLowerCase={true}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <CheckboxComp
                      name="kawasan_berikat"
                      label="Kawasan Berikat"
                      control={control}
                      disabled={true}
                    />
                  </Grid>
                  {!checkFieldRule("search_term") && (
                    <Grid item xs={5}>
                      <TextFieldComp
                        name="search_term"
                        label={t("Search Term") + " *"}
                        control={control}
                        disabled={checkFieldRule("search_term")}
                        t={t}
                        rules={{
                          required: "Please insert this field",
                          maxLength: {
                            value: 100,
                            message: "Max 100 Character",
                          },
                        }}
                        toUpperCase={true}
                        tooltip={t("Akronim atau istilah pencarian yang akan digunakan di SAP")}
                      />
                    </Grid>
                  )}
                  <Grid item xs={4}>
                    <TextFieldComp
                      name="id_coupa"
                      label={t("ID COUPA") + " *"}
                      control={control}
                      disabled={true}
                      t={t}
                      rules={{
                        required: "Please insert this field",
                        maxLength: {
                          value: 100,
                          message: "Max 100 Character",
                        },
                      }}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
            <Accordion
              expanded={expanded.panelInfoAcc}
              onChange={e => {
                toggle({ type: FormTab.InfoAcc });
              }}
              TransitionProps={{ unmountOnExit: true }}
            >
              <AccordionSummary
                sx={{
                  pointerEvents: "none",
                }}
                expandIcon={
                  <ExpandMoreIcon
                    sx={{
                      pointerEvents: "auto",
                    }}
                  />
                }
                id="panelCompDet"
              >
                <Typography>{t("Website and Social Media Vendor Information")}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextFieldComp
                      name="website_url"
                      t={t}
                      label={t("URL Website")}
                      control={control}
                      disabled={true}
                      rules={{
                        maxLength: { value: 500, message: "Max 500 Character" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextFieldComp
                      name="ig_link"
                      t={t}
                      label={t("Instagram")}
                      control={control}
                      disabled={true}
                      rules={{
                        maxLength: { value: 500, message: "Max 500 Character" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextFieldComp
                      name="fb_link"
                      t={t}
                      label={t("Facebook")}
                      control={control}
                      disabled={true}
                      rules={{
                        maxLength: { value: 500, message: "Max 500 Character" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextFieldComp
                      name="twt_link"
                      t={t}
                      label={t("Twitter")}
                      control={control}
                      disabled={true}
                      rules={{
                        maxLength: { value: 500, message: "Max 500 Character" },
                      }}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
            <Accordion
              expanded={expanded.panelCompOrg}
              onChange={e => {
                toggle({ type: FormTab.CompOrg });
              }}
              TransitionProps={{ unmountOnExit: true }}
            >
              <AccordionSummary
                sx={{
                  pointerEvents: "none",
                }}
                expandIcon={
                  <ExpandMoreIcon
                    sx={{
                      pointerEvents: "auto",
                    }}
                  />
                }
                id="panelCompDet"
              >
                <Typography>{t("Company Organization")}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextFieldComp
                      name="nama_direktur"
                      t={t}
                      label={t("Director Name") + " *"}
                      control={control}
                      disabled={true}
                      toUpperCase={true}
                      rules={{
                        required: "Please insert this field",
                        maxLength: { value: 300, message: "Max 300 Character" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextFieldComp
                      name="nama_pic"
                      t={t}
                      label={t("PIC Name") + " *"}
                      control={control}
                      disabled={true}
                      toUpperCase={true}
                      rules={{
                        required: "Please insert this field",
                        maxLength: { value: 300, message: "Max 300 Character" },
                      }}
                      tooltip={t("Nama dari pihak vendor yang mengisi form")}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <PatternFieldComp
                      name="no_telf_pic"
                      label={t("Handphone Number PIC")}
                      useplaceholder
                      control={control}
                      disabled={true}
                      format={phoneNumber}
                      isNumString={false}
                      tooltip={
                        t("Nomor handphone pihak vendor yang berhubungan dengan KPN") +
                        ". " +
                        t("Gunakan format kode telfon internasional")
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextFieldComp
                      name="email_pic"
                      t={t}
                      label={t("Email PIC") + " *"}
                      control={control}
                      disabled={true}
                      toLowerCase={true}
                      tooltip={t("Alamat email pihak vendor yang berhubungan dengan KPN")}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextFieldComp
                      name="email_fin"
                      t={t}
                      label={t("Email Finance") + " *"}
                      control={control}
                      disabled={true}
                      toLowerCase={true}
                      tooltip={t("Email finance dari pihak vendor")}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
            <Accordion
              expanded={expanded.panelAddr}
              onChange={e => {
                toggle({ type: FormTab.Addr });
              }}
              TransitionProps={{ unmountOnExit: true }}
            >
              <AccordionSummary
                sx={{
                  pointerEvents: "none",
                }}
                expandIcon={
                  <ExpandMoreIcon
                    sx={{
                      pointerEvents: "auto",
                    }}
                  />
                }
                id="panelAddr"
              >
                <div style={{ display: "flex", gap: 2 }}>
                  <Typography>{t("Address Company")}</Typography>
                </div>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={9}>
                    <Box
                      sx={{
                        position: "relative",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 1,
                        borderStyle: "solid",
                        borderWidth: "1px",
                        borderColor: theme.palette.grey[400],
                        borderRadius: "20px",
                        padding: 3,
                      }}
                    >
                      <p
                        style={{
                          position: "absolute",
                          top: "-13px",
                          padding: "0 10px 0 10px",
                          margin: "0",
                          backgroundColor: "white",
                          color: theme.palette.grey[600],
                        }}
                      >
                        {t("Alamat") + " *"}
                      </p>
                      <TextFieldComp
                        name="street"
                        t={t}
                        control={control}
                        maxLength={35}
                        disabled={true}
                        rules={{
                          required: "Please insert this field",
                          maxLength: {
                            value: 35,
                            message: "Max 35 Character, continue to field below if not enough",
                          },
                          // pattern: {
                          //   value: /^[^,]*$/,
                          //   message: t(`Please fill without ',' (comma) character`),
                          // },
                        }}
                        toUpperCase={true}
                      />
                      <TextFieldComp
                        name="street2"
                        t={t}
                        control={control}
                        disabled={true}
                        rules={{
                          maxLength: {
                            value: 35,
                            message: "Max 35 Character, continue to field below if not enough",
                          },
                          // pattern: {
                          //   value: /^[^,]*$/,
                          //   message: `Please fill without ',' (comma) character`,
                          // },
                        }}
                        toUpperCase={true}
                      />
                      <TextFieldComp
                        name="street3"
                        t={t}
                        control={control}
                        disabled={true}
                        rules={{
                          maxLength: {
                            value: 35,
                            message: "Max 35 Character, continue to field below if not enough",
                          },
                          // pattern: {
                          //   value: /^[^,]*$/,
                          //   message: `Please fill without ',' (comma) character`,
                          // },
                        }}
                        toUpperCase={true}
                      />
                      <TextFieldComp
                        name="street4"
                        t={t}
                        control={control}
                        disabled={true}
                        rules={{
                          maxLength: { value: 35, message: "Max 35 Character" },
                          // pattern: {
                          //   value: /^[^,]*$/,
                          //   message: `Please fill without ',' (comma) character`,
                          // },
                        }}
                        toUpperCase={true}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={3}></Grid>
                  <Grid item xs={5}>
                    <AutoCompleteSelect
                      name="city"
                      label={t("City") + " *"}
                      t={t}
                      control={control}
                      disabled={watch("localovs") == "LOCAL"}
                      options={cities}
                      rules={{
                        required: "Please insert this field",
                      }}
                      freeSolo={true}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <PatternFieldComp
                      name="postal"
                      label={t("Postal Code") + " *"}
                      t={t}
                      control={control}
                      disabled={true}
                      rules={{
                        required: chgLocal === "OVS" ? false : t("Please insert this field"),
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
              onChange={e => {
                toggle({ type: FormTab.AddrNPWP });
              }}
              TransitionProps={{ unmountOnExit: true }}
            >
              <AccordionSummary
                sx={{
                  pointerEvents: "none",
                }}
                expandIcon={
                  <ExpandMoreIcon
                    sx={{
                      pointerEvents: "auto",
                    }}
                  />
                }
                id="panelAddr"
              >
                <div style={{ display: "flex", gap: "1rem" }}>
                  <Typography>{t("Address NPWP")}</Typography>
                </div>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={9}>
                    <Box
                      sx={{
                        display: "flex",
                        position: "relative",
                        flexWrap: "wrap",
                        gap: 1,
                        borderStyle: "solid",
                        borderWidth: "1px",
                        borderColor: theme.palette.grey[400],
                        borderRadius: "20px",
                        padding: 3,
                        mt: "16px",
                      }}
                    >
                      <p
                        style={{
                          position: "absolute",
                          top: "-13px",
                          padding: "0 10px 0 10px",
                          margin: "0",
                          backgroundColor: "white",
                          color: theme.palette.grey[600],
                        }}
                      >
                        {t("Alamat") + " *"}
                      </p>
                      <TextFieldComp
                        name="street_npwp"
                        t={t}
                        control={control}
                        disabled={true}
                        rules={{
                          required: "Please insert this field",
                          maxLength: {
                            value: 35,
                            message: "Max 35 Character, continue to field below if not enough",
                          },
                          // pattern: {
                          //   value: /^[^,]*$/,
                          //   message: `Please fill without ',' (comma) character`,
                          // },
                        }}
                        toUpperCase={true}
                      />
                      <TextFieldComp
                        name="street2_npwp"
                        t={t}
                        control={control}
                        disabled={true}
                        rules={{
                          maxLength: {
                            value: 35,
                            message: "Max 35 Character, continue to field below if not enough",
                          },
                          // pattern: {
                          //   value: /^[^,]*$/,
                          //   message: `Please fill without ',' (comma) character`,
                          // },
                        }}
                        toUpperCase={true}
                      />
                      <TextFieldComp
                        name="street3_npwp"
                        t={t}
                        control={control}
                        disabled={true}
                        rules={{
                          maxLength: {
                            value: 35,
                            message: "Max 35 Character, continue to field below if not enough",
                          },
                          // pattern: {
                          //   value: /^[^,]*$/,
                          //   message: `Please fill without ',' (comma) character`,
                          // },
                        }}
                        toUpperCase={true}
                      />
                      <TextFieldComp
                        name="street4_npwp"
                        t={t}
                        control={control}
                        disabled={true}
                        rules={{
                          maxLength: { value: 35, message: "Max 35 Character" },
                          // pattern: {
                          //   value: /^[^,]*$/,
                          //   message: `Please fill without ',' (comma) character`,
                          // },
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
                      label={t("City") + " *"}
                      control={control}
                      disabled={watch("localovs") == "LOCAL"}
                      options={cities}
                      rules={{
                        required: "Please insert this field",
                      }}
                      freeSolo={true}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <PatternFieldComp
                      name="postal_npwp"
                      t={t}
                      label={t("Postal Code") + " *"}
                      control={control}
                      disabled={true}
                      rules={{
                        required: chgLocal === "OVS" ? false : "Please insert this field",
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
              onChange={e => {
                toggle({ type: FormTab.AddrsSPPKP });
              }}
              TransitionProps={{ unmountOnExit: true }}
            >
              <AccordionSummary
                sx={{
                  pointerEvents: "none",
                }}
                expandIcon={
                  <ExpandMoreIcon
                    sx={{
                      pointerEvents: "auto",
                    }}
                  />
                }
                id="panelAddr"
              >
                <div style={{ display: "flex", gap: "1rem" }}>
                  <Typography>{t("Address SPPKP")}</Typography>
                </div>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={9}>
                    <Box
                      sx={{
                        position: "relative",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 1,
                        borderStyle: "solid",
                        borderWidth: "1px",
                        borderColor: theme.palette.grey[400],
                        borderRadius: "20px",
                        padding: 3,
                        mt: "16px",
                      }}
                    >
                      <p
                        style={{
                          position: "absolute",
                          top: "-13px",
                          padding: "0 10px 0 10px",
                          margin: "0",
                          backgroundColor: "white",
                          color: theme.palette.grey[600],
                        }}
                      >
                        {t("Alamat") + " *"}
                      </p>
                      <p
                        style={{
                          position: "relative",
                          fontSize: "8pt",
                          margin: "0",
                          color: theme.palette.grey[600],
                        }}
                      >
                        {`Max 50 ${t("Karakter")} ${t(
                          `Please fill without ',' (comma) character`
                        )} ${t(`Mohon dilanjutkan ke kolom berikutnya jika tidak cukup`)}`}
                      </p>
                      <TextFieldComp
                        name="street_sppkp"
                        t={t}
                        control={control}
                        disabled={true}
                        rules={{
                          required: "Please insert this field",
                          maxLength: {
                            value: 35,
                            message: "Max 35 Character, continue to field below if not enough",
                          },
                          // pattern: {
                          //   value: /^[^,]*$/,
                          //   message: `Please fill without ',' (comma) character`,
                          // },
                        }}
                        toUpperCase={true}
                      />
                      <TextFieldComp
                        name="street2_sppkp"
                        t={t}
                        control={control}
                        disabled={true}
                        rules={{
                          maxLength: {
                            value: 35,
                            message: "Max 35 Character, continue to field below if not enough",
                          },
                          // pattern: {
                          //   value: /^[^,]*$/,
                          //   message: `Please fill without ',' (comma) character`,
                          // },
                        }}
                        toUpperCase={true}
                      />
                      <TextFieldComp
                        name="street3_sppkp"
                        t={t}
                        control={control}
                        disabled={true}
                        rules={{
                          maxLength: {
                            value: 35,
                            message: "Max 35 Character, continue to field below if not enough",
                          },
                          // pattern: {
                          //   value: /^[^,]*$/,
                          //   message: `Please fill without ',' (comma) character`,
                          // },
                        }}
                        toUpperCase={true}
                      />
                      <TextFieldComp
                        name="street4_sppkp"
                        t={t}
                        control={control}
                        disabled={true}
                        rules={{
                          maxLength: { value: 35, message: "Max 35 Character" },
                          // pattern: {
                          //   value: /^[^,]*$/,
                          //   message: `Please fill without ',' (comma) character`,
                          // },
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
                      label={t("City")}
                      control={control}
                      disabled={watch("localovs") == "LOCAL"}
                      options={cities}
                      rules={{
                        required: "Please insert this field",
                      }}
                      freeSolo={true}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <PatternFieldComp
                      name="postal_sppkp"
                      t={t}
                      label={t("Postal Code")}
                      control={control}
                      disabled={true}
                      rules={{
                        required: chgLocal === "OVS" ? false : "Please insert this field",
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
              onChange={e => {
                toggle({ type: FormTab.Tax });
              }}
              TransitionProps={{ unmountOnExit: true }}
            >
              <AccordionSummary
                sx={{
                  pointerEvents: "none",
                }}
                expandIcon={
                  <ExpandMoreIcon
                    sx={{
                      pointerEvents: "auto",
                    }}
                  />
                }
              >
                <Typography>{t("Tax and Payment")}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <CheckboxComp
                      name="ispkp"
                      label="Pengusaha Kena Pajak (PKP)"
                      control={control}
                      disabled={true}
                    />
                  </Grid>
                  <Grid item xs={12}></Grid>
                  <Grid item xs={3}>
                    <SwitchComponent
                      name="is_new_npwp"
                      control={control}
                      frontlabel={"16 Digit"}
                      backlabel={"Old"}
                      disabled={true}
                    />
                  </Grid>
                  <Grid item xs={5}>
                    {watch("is_new_npwp") == true && (
                      <NumericFieldComp
                        name="npwp"
                        t={t}
                        disabled={true}
                        rules={{
                          required:
                            watch("localovs") == "LOCAL" ? "Please insert this field" : false,
                          minLength: {
                            value: 16,
                            message: "Isi 16 digit",
                          },
                          maxLength: {
                            value: 16,
                            message: "Isi 16 digit",
                          },
                        }}
                        label={t("Tax Number") + (watch("localovs") == "LOCAL" ? " *" : "")}
                        control={control}
                        thousandSeparator={false}
                        allowLeadingZeros={true}
                      />
                    )}
                    {watch("is_new_npwp") == false && (
                      <PatternFieldComp
                        name="npwp"
                        t={t}
                        helperText={"Mohon input hanya nominal tanpa karakter spesial"}
                        label={t("Tax Number") + (watch("localovs") == "LOCAL" ? " *" : "")}
                        useplaceholder
                        format="##.###.###.#-###.###"
                        mask={"_"}
                        control={control}
                        disabled={true}
                        rules={{
                          pattern: {
                            value: /^[0-9.-]+$/,
                            message:
                              "format not matched. only numbers (0-9), point (.), and hyphen (-)",
                          },
                          minLength: {
                            value: 20,
                            message: "Karakter tidak cukup",
                          },
                          maxLength: {
                            value: 21,
                            message: "Mohon isi dengan lengkap",
                          },
                          required:
                            watch("localovs") == "LOCAL" ? "Please insert this field" : false,
                        }}
                      />
                    )}
                  </Grid>
                  <Grid item xs={4}>
                    <SelectComp
                      name="paymthd"
                      t={t}
                      label={t("Payment Method") + " *"}
                      control={control}
                      options={[
                        { value: "bank", label: "Bank" },
                        { value: "cash", label: "Cash" },
                        { value: "giro", label: "Giro" },
                      ]}
                      disabled={true}
                      rules={{
                        required: "Please insert this field",
                      }}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <SelectComp
                      name="payterm"
                      t={t}
                      label={t("Payment Term") + " *"}
                      control={control}
                      options={payterm.current}
                      disabled={true}
                      rules={{
                        required: "Please insert this field",
                      }}
                      tooltip={t("Jangka waktu pembayaran")}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <SelectComp
                      name="ppn_type"
                      t={t}
                      label={t("VAT Type") + " *"}
                      control={control}
                      options={ppn_type.current}
                      disabled={true}
                      rules={{
                        required: "Please insert this field",
                      }}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextFieldComp
                      name="nitku"
                      label={t("NITKU") + " *"}
                      control={control}
                      disabled={true}
                      t={t}
                      rules={{
                        required: "Please insert this field",
                        maxLength: {
                          value: 100,
                          message: "Max 100 Character",
                        },
                      }}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
            {(!checkFieldRule("vendetail") ||
              data_form.ticket_stat == false ||
              emp_role_id == "STAFF") && (
              <Accordion
                expanded={expanded.panelVendetail}
                onChange={e => {
                  toggle({ type: FormTab.VenDetail });
                }}
                TransitionProps={{ unmountOnExit: true }}
              >
                <AccordionSummary
                  sx={{
                    pointerEvents: "none",
                  }}
                  expandIcon={
                    <ExpandMoreIcon
                      sx={{
                        pointerEvents: "auto",
                      }}
                    />
                  }
                >
                  <Typography>{t("Vendor Details")}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <SelectComp
                        name="company"
                        t={t}
                        label={t("Company") + " *"}
                        control={control}
                        options={comps.current}
                        disabled={true}
                        rules={{
                          required: "Please insert this field",
                        }}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <AutoSelectPurOrg
                        name="purchorg"
                        label="Purchasing Organization *"
                        control={control}
                        disabled={true}
                        rules={{
                          required: "Please insert this field",
                        }}
                        t={t}
                      />
                    </Grid>
                    <Grid item xs={3}></Grid>
                    <Grid item xs={4}>
                      <SelectComp
                        name="vengroup"
                        t={t}
                        label="Vendor Group *"
                        control={control}
                        options={vengroups}
                        onChangeovr={funChgVgrp}
                        disabled={true}
                        rules={{
                          required: "Please insert this field",
                        }}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <SelectComp
                        name="venacc"
                        t={t}
                        label="Vendor Account *"
                        control={control}
                        options={[
                          { value: "TRADE", label: "Trade" },
                          { value: "NON_TRADE", label: "Non Trade" },
                        ]}
                        onChangeovr={funChgVacc}
                        disabled={true}
                        rules={{
                          required: "Please insert this field",
                        }}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <SelectComp
                        name="ventype"
                        t={t}
                        label="Vendor Type *"
                        control={control}
                        options={
                          chgVenacc !== "NON_TRADE"
                            ? [{ value: "X", label: "X" }]
                            : ventypeList[chgVengrp]
                            ? ventypeList[chgVengrp]
                            : [{ value: "X", label: "X" }]
                        }
                        disabled={true}
                        rules={{
                          required: "Please insert this field",
                        }}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <SelectComp
                        name="currency"
                        t={t}
                        label={t("Limit Currency") + `${chgVenacc === "TRADE" ? " *" : ""}`}
                        control={control}
                        options={currencies}
                        onChangeovr={funChgCurr}
                        disabled={true}
                        rules={{
                          required: chgVenacc === "TRADE" ? "Please insert this field" : false,
                        }}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <NumericFieldComp
                        t={t}
                        name="limit"
                        label={t("Limit") + `${chgVenacc === "TRADE" ? " *" : ""}`}
                        control={control}
                        format={["thousandSeparator"]}
                        currency={chgCurr}
                        disabled={true}
                        rules={{
                          required: chgVenacc === "TRADE" ? t("Please insert this field") : false,
                        }}
                      />
                    </Grid>
                    <Grid item xs={4}></Grid>
                    <Grid item xs={5}>
                      <CheckboxComp
                        name="is_tender"
                        label={t("Vendor Tender Participant")}
                        control={control}
                        disabled={true}
                        onChangeovr={funChgTdr}
                      />
                      <CheckboxComp
                        name="is_priority"
                        label={t("Vendor Priority")}
                        control={control}
                        disabled={true}
                      />
                      <CheckboxComp
                        name="is_interest"
                        label={t("Interest Payment Priority")}
                        control={control}
                        disabled={true}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextFieldComp
                        t={t}
                        name="description"
                        label="Description *"
                        // helperText={t('Wajib diisi jika vendor mengikuti tender')}
                        control={control}
                        disabled={true}
                        // rules={{ required: "Please insert this field" }}
                        tooltip={t("Alasan memilih vendor tersebut menjadi rekanan KPN")}
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            )}
          </form>
          <Accordion
            expanded={expanded.panelBank}
            onChange={e => {
              toggle({ type: FormTab.Bank });
            }}
            TransitionProps={{ unmountOnExit: true }}
          >
            <AccordionSummary
              sx={{
                pointerEvents: "none",
              }}
              expandIcon={
                <ExpandMoreIcon
                  sx={{
                    pointerEvents: "auto",
                  }}
                />
              }
            >
              <Typography>{t("Bank Information")}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {errors.bank && <p style={{ color: "red" }}>{t("Please insert this field")}</p>}
              <VenBankTableCoupa
                control={control}
                fields={fields}
                append={append}
                remove={remove}
                getValues={getValues}
                countries={countries.current}
                currencies={currencies}
                watch={watch}
                is_local={chgLocal === "LOCAL"}
                is_allow={true}
                t={t}
                ven_id={loader_data.ven_id}
                clearField={resetField}
                setValue={setValue}
              />
            </AccordionDetails>
          </Accordion>
          {!checkFieldRule("vendorcode") && (
            <Accordion
              expanded={expanded.panelApproval}
              onChange={e => {
                toggle({ type: FormTab.Approval });
              }}
              TransitionProps={{ unmountOnExit: true }}
            >
              <AccordionSummary
                sx={{ pointerEvents: "none" }}
                expandIcon={<ExpandMoreIcon sx={{ pointerEvents: "auto" }} />}
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
                      disabled={checkFieldRule("vendorcode")}
                      rules={{
                        required: t("Please insert this field"),
                        maxLength: {
                          value: 10,
                          message: "Max character is 10",
                        },
                        minLength: {
                          value: 9,
                          message: t("Please insert this field"),
                        },
                      }}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          )}

          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <Box>
              {data_form.emp_role_id !== "VENDOR" && (
                <Button
                  sx={{ height: 50, width: 100, margin: 2 }}
                  color="error"
                  variant="text"
                  onClick={() => {
                    navigate("../ticket");
                  }}
                >
                  {t("Back")}
                </Button>
              )}
            </Box>
            <Box>
              {!checkFieldRule("submit") && (
                <Button
                  sx={{ height: 50, width: 100, margin: 2 }}
                  variant="contained"
                  type="submit"
                  onClick={() => {
                    // console.log(testSubmitForm());
                    handleSubmit(value => {
                      is_draft.current = false;
                      if (
                        (isTender || value.is_priority || value.is_interest) &&
                        emp_role_id == "STAFF" &&
                        isValid
                      ) {
                        setConfOpen(true);
                      } else {
                        submitForm(value);
                      }
                    })();
                  }}
                  disabled={btnClicked}
                >
                  {t("Submit")}
                </Button>
              )}
            </Box>
          </Box>
        </Container>

        <Snackbar
          open={formStat.stat}
          onClose={handleSnackClose}
          autoHideDuration={3000}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert severity={formStat.type} onClose={handleSnackClose} variant="filled">
            {formStat.message}
          </Alert>
        </Snackbar>
        <Snackbar
          open={
            (loader_data.ticket_type == "CREATE_NEW_VENDOR_UPS" ||
              loader_data.ticket_type == "CREATE_NEW_VENDOR_DWS") &&
            emp_role_id == "" &&
            loader_data.approval_pos != "0" &&
            loader_data.ticket_type != "" &&
            loader_data.approval_pos != null
          }
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert severity="success" variant="filled">
            {`${t("Ticket Number")} ${loader_data.ticket_num} ${t("has already submitted")}`}
          </Alert>
        </Snackbar>
        <Backdrop
          sx={{ color: "#fff", zIndex: theme => theme.zIndex.drawer + 1 }}
          open={
            loading
            // || loadingCountry || loadingCurr || loadingBanks || loadingInitFile || loadingComp || loadingPayterm
          }
        >
          <CircularProgress color="inherit" disableShrink />
        </Backdrop>
      </Container>
    </>
  );
}

export default CoupaForm;
