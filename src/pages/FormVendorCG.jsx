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
  IconButton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import useSessionStore from "src/store/useSessionStore";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import UploadButton from "src/components/common/UploadButton";
import { useNavigate } from "react-router-dom";
import axios, { isAxiosError } from "axios";
import { TextFieldComp } from "src/components/common/TextFieldComp";
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
import { v4 } from "uuid";
import useTogglePanel, { FormTab } from "src/hooks/useTogglePanel";
import { useMasterFetcher } from "src/hooks/MasterFetcher";

import RejectLog from "src/components/common/RejectLog";
import VenBankTableRefactor from "src/components/FormVendor/VenBankTableRefactorCG";
import usePermissionStore from "src/store/userPermissionStore";
import { useFormCreateNew } from "./create_new/DirectFormCreateNew";
import SwitchComponent from "src/components/common/SwitchComponent";
import TooltipButton from "src/components/common/TooltipButton";
import ModalShowDataVendor from "src/components/FormVendor/ModalShowDataVendor";
import AuthorizeTipTopProvider from "src/components/FormVendor/DialogAuthTiptop";

function FormVendorCG() {
  const data_form = useFormCreateNew();
  const theme = useTheme();
  const role = useSessionStore(state => state.role);
  const emp_role_id = useSessionStore(state => state.emp_role_id);
  const bu_id = useSessionStore(state => state.bu_id);
  const dept_id = useSessionStore(state => state.dept_id);
  const axiosPrivate = useAxiosPrivate();
  const [field_rule, setFieldRule] = useState({
    condition: "enabled",
    fields: [],
  });

  //Master options
  const { data: VenClass, loading: loadingVenClass } = useMasterFetcher({
    link: "/master/cg/venclass",
  });
  const { data: UsedTax, loading: loadingUsedTax } = useMasterFetcher({
    link: "/master/cg/usedtax",
  });
  const { data: PriceTerm, loading: loadingPriceTerm } = useMasterFetcher({
    link: "/master/cg/priceterm",
  });
  const { data: PayTerm, loading: loadingPayterm } = useMasterFetcher({
    link: "/master/cg/payterm",
  });
  const { data: CurrencyCG, loading: loadingCurr } = useMasterFetcher({
    link: "/master/cg/currency",
  });
  const { data: CountryCG, loading: loadingCountry } = useMasterFetcher({
    link: "/master/cg/country",
  });
  const { data: VenType, loading: loadingVentype } = useMasterFetcher({
    link: "/master/cg/ventype",
  });

  useEffect(() => {
    if (
      loadingVenClass ||
      loadingUsedTax ||
      loadingPayterm ||
      loadingPriceTerm ||
      loadingCurr ||
      loadingCountry ||
      loadingVentype
    ) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [
    loadingVenClass,
    loadingUsedTax,
    loadingPriceTerm,
    loadingPayterm,
    loadingCurr,
    loadingCountry,
    loadingVentype,
  ]);
  const VenClassOpt = useMemo(() => {
    return VenClass.map(value => ({
      value: value.class_code,
      label: `${value.class_desc} (${value.class_code})`,
    }));
  }, [VenClass]);

  const UsedTaxOpt = useMemo(() => {
    return UsedTax.map(value => ({
      value: value.used_tax_code,
      label: `${value.used_tax_desc} (${value.used_tax_code})`,
    }));
  }, [UsedTax]);

  const PriceTermOpt = useMemo(() => {
    return PriceTerm.map(value => ({
      value: value.price_term_code,
      label: `${value.price_term_code} - ${value.price_term_desc}`,
    }));
  }, [PriceTerm]);

  const PayTermOpt = useMemo(() => {
    return PayTerm.map(value => ({
      value: value.pay_term_code,
      label: `${value.pay_term_desc} (${value.pay_term_code})`,
    }));
  }, [PayTerm]);

  const CurrencyOpt = useMemo(() => {
    return CurrencyCG.map(value => ({
      value: value.currency_code,
      label: `${value.currency_code} - ${value.currency_name}`,
    }));
  }, [CurrencyCG]);

  const CountryOpt = useMemo(() => {
    return CountryCG.map(value => ({
      value: value.country_code,
      label: `${value.country_name} (${value.country_code})`,
    }));
  }, [CountryCG]);

  const VenTypeOpt = useMemo(() => {
    return VenType.map(value => ({
      value: value.type_code,
      label: `${value.type_name}
      `,
    }));
  }, [VenType]);
  //reducerFunction
  const { expanded, toggle } = useTogglePanel();

  const defaultValue = {
    emailRequestor: "",
    deptRequestor: "",
    ventype: "",
    name1: "",
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
    ispkp: false,
    npwp: "",
    paymthd: "", //price_term
    payterm: "C3000B",
    used_tax: "P11A",
    is_new_npwp: false,
    currency: "",
    vengroup: "",
    ven_class: "",
    description: "",
    vendorcode: "",
    // search_term: "", //abbreviation
    website_url: "",
    ig_link: "",
    fb_link: "",
    twt_link: "",
    nama_direktur: "",
    nama_pic: "",
    no_telf_pic: "",
    email_pic: "",
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
    formState: { errors, isValid },
    clearErrors,
    trigger,
  } = useForm({ defaultValues: defaultValue, mode: "onChange" });

  const { fields, append, remove } = useFieldArray({
    control: control,
    name: "bank",
    rules: { required: true },
  });

  const { handleSubmit: handleSubmit1, control: control1 } = useForm({
    defaultValues: {
      remarks: "",
    },
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
    approval_pos: null,
    logrej_counter: null,
  });

  const checkFieldRule = useCallback(
    field_name => {
      let is_exist = true;
      if (data_form.ticket_stat == false) {
        return true;
      }
      if (field_rule.fields[0] == "all" || emp_role_id == "ADMIN") {
        is_exist = true;
      } else {
        is_exist = field_rule.fields.includes(field_name);
      }
      if (field_rule.condition == "enabled" || emp_role_id == "ADMIN") {
        return !is_exist;
      } else {
        return is_exist;
      }
    },
    [field_rule.fields, emp_role_id]
  );

  useEffect(() => {
    const ven_type = getValues("ventype");
    if (ven_type == "OVERSEAS" || ven_type == "GOVERNMENT") {
      setValue("npwp", "");
      setValue("ispkp", false);
      clearErrors("npwp");
      trigger("npwp");
    }
  }, [watch("ventype")]);

  useEffect(() => {
    setBtnclick(false);
    if (Object.keys(data_form).length == 0) {
      return;
    }
    const data = data_form;
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      try {
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

        const { data: bankInit } = await axiosPrivate.get(
          `/vendor/bank/${data_form.ven_id === null ? data.ticket_ven_id : data.ven_id}`,
          { signal: controller.signal }
        );
        const resultBank = bankInit.data;

        const valueForm = {
          emailRequestor: data.email_proc || "",
          deptRequestor: data.dep_proc || "",
          titlecomp: data.title || "",
          localovs: data.local_ovs || "",
          name1: data.name_1 || "",
          country: data.country || "",
          street: data.street || "",
          street2: data.street2 || "",
          street3: data.street3 ?? "",
          street4: data.street4 ?? "",
          postal: data.postal || "",
          city: data.city || "",
          street_sppkp: data.street_sppkp ?? "",
          street2_sppkp: data.street2_sppkp ?? "",
          street3_sppkp: data.street3_sppkp ?? "",
          street4_sppkp: data.street4_sppkp ?? "",
          postal_sppkp: data.postal_sppkp ?? "",
          city_sppkp: data.city_sppkp ?? "",
          street_npwp: data.street_npwp ?? "",
          street2_npwp: data.street2_npwp ?? "",
          street3_npwp: data.street3_npwp ?? "",
          street4_npwp: data.street4_npwp ?? "",
          postal_npwp: data.postal_npwp ?? "",
          city_npwp: data.city_npwp ?? "",
          telf: data.telf1 || "",
          fax: data.fax || "",
          email: data.email || "",
          ispkp: data.is_pkp || false,
          npwp: data.npwp || "",
          paymthd: data.pay_mthd || "",
          payterm: data.pay_term == null || data.pay_term == "" ? "C3000B" : data.pay_term,
          company: data.company || "",
          purchorg: data.purch_org ? { value: data.purch_org, label: data.purch_org } : null,
          vengroup: data.ven_group || "",
          venacc: data.ven_acc || "",
          ventype: data.ven_type || "",
          currency: data.lim_curr || "",
          description: data.description || "",
          is_tender: data.is_tender || false,
          is_priority: data.is_priority || false,
          vendorcode: data.ven_code,
          remarks_readOnly: data.remarks || "",
          remarks: "",
          limit: data.limit_vendor || "",
          reject_by: data.reject_by || "",
          // search_term: data.search_term || "",
          is_active: data.ticket_stat,
          website_url: data.website_url ?? "",
          ig_link: data.ig_link ?? "",
          fb_link: data.fb_link ?? "",
          twt_link: data.twt_link ?? "",
          nama_direktur: data.nama_direktur ?? "",
          nama_pic: data.nama_pic ?? "",
          no_telf_pic: data.no_telf_pic ?? "",
          email_pic: data.email_pic ?? "",
          used_tax: data.used_tax == null || data.used_tax == "" ? "P11A" : data.used_tax,
          is_new_npwp: data.is_new_npwp ?? false,
          ven_class: data.ven_class ?? "",
          bank: resultBank.map(item => ({
            id: item.id,
            bank_country: { value: item.country, label: item.country },
            bank_id: item.bank_code
              ? {
                  value: item.bank_code,
                  label: `${item.bank_name} (${item.bank_code})${item.is_new ? " (new)" : ""}`,
                }
              : null,
            bank_curr: item.bank_curr ? { value: item.bank_curr, label: item.bank_curr } : null,
            bank_acc: item.bank_acc,
            acc_hold: item.acc_hold,
            account_statement_letter: item.account_statement_letter && {
              file_name: item.account_statement_letter,
              file_id: item.account_statement_letter_id,
            },
            passbook: item.passbook && {
              file_name: item.passbook,
              file_id: item.passbook_id,
            },
          })),
          bunit: data.bunit,
        };

        if (valueForm.name1 === "") {
          setCheckex(true);
          toggle({ type: FormTab.RestrictForm });
        } else {
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
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
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
  const [fileType, setFileType] = useState([]);
  const [chgLocal, setLocal] = useState("");
  const [compTitle, setComptitle] = useState(loader_data.data?.titlecomp);
  const [compName, setCompname] = useState();
  const [checkIsExist, setCheckex] = useState(true);
  const [openAlert, setOpenAlert] = useState(false);
  const [btnClicked, setBtnclick] = useState(true);
  const [modalRejectopen, setModalopen] = useState(false);
  const [modalConfirmopen, setConfOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(false);
  const [loadAddBank, setLoadAddBnk] = useState(false);
  const [openModalInfo, setOpenModalInfo] = useState(false);
  const [modalInfoAnc, setModalInfoAnc] = useState(null);
  const [langCode, setLang] = useState("id");
  const { t, i18n } = useTranslation("translation", { lng: langCode });

  const [initDataFile, setInitDfile] = useState([]);
  const fileCheck = useMemo(() => getValues("file_atth"), [watch("file_atth")]);

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
  const funChgIsPTKP = useCallback(item => {}, []);
  const funChgComp = useCallback(item => {
    setChgComp(item);
    resetField("purchorg");
  }, []);

  const checkExist = useCallback(async item => {
    setLoadex(true);
    try {
      const checkExt = await axiosPrivate.get(`/vendor/checkven?name=${item}`);
      setCheckex(false);
      toggle({ type: FormTab.OpenForm });
      setLoadex(false);
      setBtnclick(false);
    } catch (error) {
      console.log(error);
      setOpenAlert(true);
      toggle({ type: FormTab.RestrictForm });
      setLoadex(false);
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
    // console.log(loader_data);
    reset(loader_data.data);
    setChgCty(loader_data.data?.country);
    setVengrp(loader_data.data?.vengroup);
    setVenacc(loader_data.data?.venacc);
    setChgCurr(loader_data.data?.currency);
    setComptitle(loader_data.data?.titlecomp);
    setCompname(loader_data.data?.name1);
    setLocal(loader_data.data?.localovs);
  }, [loader_data]);

  useEffect(() => {
    const controller = new AbortController();
    if (getValues("ventype")) {
      (async () => {
        try {
          unregister("file_atth");
          const { data } = await axiosPrivate.get(
            `/master/filetype?ventype=${getValues("ventype")}&bu_id=${
              data_form.bu_ticket_type
            }&curpos=${data_form.emp_role_id}`,
            {
              signal: controller.signal,
            }
          );
          console.log(data);
          data.data.forEach(item => {
            register(
              `file_atth.${item.file_code}`,
              item.is_mandatory && {
                required: item.file_type,
              }
            );

            const fileInit = initDataFile
              .filter(element => element.file_type === item.file_code)
              .map(item => item.file_name);
            if (fileInit) {
              setValue(`file_atth.${item.file_code}`, fileInit[0]);
            }
          });
          setFileType(
            data.data.map(item => {
              return {
                key: item.file_code,
                value: `${t(item.file_type)} ${item.is_mandatory ? "*" : ""}`,
                help: langCode === "id" ? item.help : item.helpen,
                need_exp_date: item.need_exp_date,
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
  }, [watch("ventype"), langCode, loader_data, t, fields, initDataFile]);

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
  // const cities = useRef([{ value: '', label: '' }]);
  const banks = useRef([{ value: "", label: "" }]);
  const payterm = useRef([{ value: "", label: "" }]);
  const comps = useRef([{ value: "", label: "" }]);
  const uploadButRef = useRef(null);
  const onLoad = useRef(false);

  const [cities, setCities] = useState([{ value: "", label: "" }]);
  const [loading, setLoading] = useState(false);
  const [loadingEx, setLoadex] = useState(false);
  const is_draft = useRef(false);

  const [loadingInitFile, setLoadInitFile] = useState(false);

  const [formStat, setFormStat] = useState({
    stat: false,
    type: "info",
    message: "",
  });
  const [ven_file, setVen_file] = useState([]);
  useMemo(() => ({ cities, countries, currencies }), [cities, countries, currencies]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
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
    })();
    return () => {
      controller.abort();
    };
  }, [loader_data, watch("ventype")]);

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
            countryId: getValues("country"),
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
        const { data: phoneNum } = await axiosPrivate.get(
          "/master/phonecode?id=" + getValues("country")
        );
        setPhnNum(`+${phoneNum.code}-################`);
      } catch (error) {
        console.error(error);
      }
    };

    if (getValues("country")) {
      dynaCity();
      getPhoneNum();
    }
    return () => {
      controller.abort();
    };
  }, [watch("country"), loader_data]);

  useEffect(() => {
    if (watch("ventype") == "LOCAL") {
      setValue("country", "ID");
    }
  }, [watch("ventype")]);

  useEffect(() => {
    console.log(getValues("city"));
  }, [watch("city")]);
  useEffect(() => {
    if (allCurr.current.length > 0) {
      setCurr(
        allCurr.current.filter(
          item => (chgLocal === "LOCAL" && item.nation === "ID") || chgLocal === "OVS"
        )
      );
    }
  }, [chgLocal, allCurr.current]);

  const setVen_fileFromChild = useCallback(newItem => {
    if (newItem.length > 0) {
      newItem.forEach(item => {
        setValue(`file_atth.${item.file_type}`, item.file_name);
      });
      setVen_file(newItem);
    }
  }, []);

  const deleteVenFile = deletedFile => {
    console.log(deletedFile);
    resetField(`file_atth.${deletedFile?.file_type}`);
  };

  const handleSnackClose = useCallback((e, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setFormStat(prev => ({ ...prev, stat: false }));
  }, []);

  const changeLang = useCallback((e, value) => {
    setLang(value);
    i18n.changeLanguage(value);
  }, []);

  const handleReject = useCallback(
    async value => {
      // setTimeout(() => {
      //   setLoading(false);
      // }, 3000);
      const rejectParams = {
        ticket_id: loader_data.ticket_id,
        remarks: value.remarks,
      };
      // console.log(rejectParams);
      try {
        setLoading(true);
        const { data: response } = await axiosPrivate.patch(`/ticket/reject`, rejectParams);
        setFormStat({ stat: true, type: "success", message: response.message });
        setLoading(false);
        setTimeout(() => {
          navigate("../../dashboard/ticket");
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
        bank_country: chgLocal === "LOCAL" ? "ID" : null,
      });
      append({
        id: bankv_id,
        bank_country: chgLocal === "LOCAL" ? { value: "ID", label: "Indonesia" } : null,
        bank_id: null,
        bank_curr: null,
        bank_acc: "",
        acc_hold: "",
      });
    } catch (error) {
      console.error(error);
      setFormStat({
        stat: true,
        type: "error",
        message: error.response?.data?.message ?? error?.message,
      });
    } finally {
      setLoadAddBnk(false);
    }
  }, [chgLocal, loader_data]);

  const submitForm = async value => {
    // setBtnclick(true);
    const controller = new AbortController();
    const filteredVenFile = ven_file.filter(item => item.method !== "");
    const ven_detail = {
      ven_id: loader_data.ven_id,
      ticket_num: loader_data.ticket_num,
      postal: value.postal.trim(),
      country: value.country,
      name_1: value.name1,
      city: typeof value.city === "object" ? value.city.value : value.city,
      street: value.street,
      street2: value.street2,
      street3: value.street3,
      street4: value.street4,
      telf1: value.telf.trim().split(/-/)[1],
      fax: value.fax.trim().split(/-/)[1],
      email: value.email,
      is_pkp: value.ispkp,
      is_new_npwp: value.is_new_npwp,
      npwp: value.npwp.trim(),
      pay_mthd: value.paymthd,
      pay_term: value.payterm,
      used_tax: value.used_tax,
      company: value.company,
      purch_org: value.purchorg?.value,
      ven_acc: value.venacc,
      ven_group: value.vengroup,
      ven_type: value.ventype,
      description: value.description,
      lim_curr: value.currency,
      // ven_code: value.vendorcode,
      // search_term: value.search_term,
      website_url: value.website_url.trim(),
      ig_link: value.ig_link.trim(),
      fb_link: value.fb_link.trim(),
      twt_link: value.twt_link.trim(),
      nama_direktur: value.nama_direktur.trim(),
      nama_pic: value.nama_pic.trim(),
      no_telf_pic: value.no_telf_pic.trim().split(/-/)[1],
      email_pic: value.email_pic.trim(),
      ven_class: value?.ven_class ?? null,
    };
    let tempBanks = [];
    let ven_bank;
    if (dirtyFields.bank) {
      dirtyFields?.bank.map((item, index) => {
        let changed = false;
        Object.keys(item).map(keys => {
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
      ven_bank = tempBanks.map(item => ({
        ...item,
        method: "update",
      }));
    } else {
      ven_bank = [];
    }

    const jsonSend = {
      role: role === undefined ? "VENDOR" : role,
      is_draft: is_draft.current,
      ticket_id: loader_data.ticket_id,
      remarks: value.remarks,
      ticket_state: ticketState,
      ven_detail: ven_detail,
      ven_banks: ven_bank,
      ven_files: filteredVenFile,
      cur_pos: loader_data.cur_pos,
    };

    // console.log(jsonSend);
    try {
      setLoading(true);
      let submit;
      if (role === undefined || data_form.type !== "form") {
        submit = await axios.post(
          `${import.meta.env.VITE_URL_LOC}/ticket/newform/submit`,
          jsonSend
        );
        // console.log('submitting...');
      } else {
        submit = await axiosPrivate.post(`/ticket/form/submit`, jsonSend);
        // console.log('submitting...');
      }
      const response = submit.data;
      setFormStat({ stat: true, type: "success", message: response.message });
      if (!is_draft.current) {
        setTimeout(() => {
          if (data_form.emp_role_id == "VENDOR") {
            navigate(0);
          } else {
            navigate("../../dashboard/ticket");
          }
        }, 3000);
        // console.log('reloading...');
      } else {
        // getInitDataBank(controller);
        getInitDataFile(controller);
      }
    } catch (err) {
      console.log(err);
      let message = err?.message;
      if (isAxiosError(err)) {
        message = err.response.data.message;
      }
      // alert(err.stack);
      setFormStat({ stat: true, type: "error", message: message });
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
      <AuthorizeTipTopProvider>
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
              {`Form Vendor Registration ${loader_data.ticket_num}`}
            </Typography>
          </Box>
          <Container>
            <form key={1}>
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
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
                    width: "100%",
                    mt: "1rem",
                    mb: "1rem",
                    "& .MuiAlert-message": {
                      width: "96%",
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      borderBox: "box-sizing",
                      width: "100%",
                    }}
                  >
                    {t("Form Rejected")}
                    <div
                      style={{
                        color: "#158fff",
                        backgroundColor: "white",
                        borderRadius: "12px",
                        padding: "0.5rem 0.5rem 0.5rem 0.5rem ",
                        width: "auto",
                        boxSizing: "border-box",
                      }}
                    >
                      <TextField
                        value={loader_data.data?.remarks_readOnly}
                        multiline
                        disabled
                        fullWidth
                      />
                      {/* {loader_data.data?.remarks_readOnly} */}
                    </div>
                  </Box>
                </Alert>
              )}

              <Accordion
                expanded={expanded.panelReqDet}
                onChange={e => {
                  toggle({ type: FormTab.ReqDet });
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
                  id="panelReqDet"
                >
                  <Typography>{t("Requestor")}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs>
                      <TextFieldComp
                        name="emailRequestor"
                        label={t("Email Requestor")}
                        control={control}
                        disabled={true}
                      />
                    </Grid>
                    <Grid item xs>
                      <TextFieldComp
                        name="deptRequestor"
                        label={t("Departement")}
                        control={control}
                        disabled={true}
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
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
                    <Grid item xs={3}>
                      <SelectComp
                        name="ventype"
                        t={t}
                        label="Vendor Type *"
                        control={control}
                        options={VenTypeOpt}
                        disabled={checkFieldRule("ventype")}
                        rules={{
                          required: "Please insert this field",
                        }}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <SelectComp
                        name="country"
                        label={t("Country") + " *"}
                        t={t}
                        control={control}
                        options={CountryOpt}
                        onChangeovr={funChgCountry}
                        disabled={checkFieldRule("country") || watch("ventype") == "LOCAL"}
                        rules={{
                          required: "Please insert this field",
                        }}
                      />
                    </Grid>
                    <Grid item xs={4}></Grid>
                    <Grid item xs={4}>
                      <TextFieldComp
                        name="name1"
                        label={t("Company Name") + " *"}
                        control={control}
                        disabled={checkFieldRule("name1")}
                        t={t}
                        rules={{
                          required: "Please insert this field",
                          maxLength: { value: 35, message: "Max 35 Character" },
                        }}
                        onChangeovr={funChgname}
                        toUpperCase={true}
                      />
                    </Grid>
                    {data_form &&
                      data_form.emp_role_id == "MDM" &&
                      data_form.emp_role_id == emp_role_id && (
                        <>
                          <Grid item xs={2}>
                            <TooltipButton
                              placement={"top"}
                              TooltipText={"Vendor Search Info"}
                              Icon={<InfoOutlinedIcon />}
                              OnClick={e => {
                                setOpenModalInfo(prev => !prev);
                                setModalInfoAnc(e.currentTarget);
                              }}
                            />
                          </Grid>
                          <ModalShowDataVendor
                            open={openModalInfo}
                            setOpen={setOpenModalInfo}
                            anchorEl={modalInfoAnc}
                            initiateQ={getValues("name1")}
                          />
                        </>
                      )}
                    {checkIsExist && (
                      <>
                        <Grid item xs={2}>
                          <LoadingButton
                            onClick={() => checkExist(getValues("name1"))}
                            sx={{ width: "4rem", height: "3.5rem" }}
                            loading={loadingEx}
                          >
                            {t("Verify")}
                          </LoadingButton>
                        </Grid>
                        <Grid item xs={4}>
                          <Alert variant="filled" severity="warning">
                            {t(
                              "Untuk melanjutkan, mohon klik verifikasi apakah nama vendor yang diisi sudah terdaftar"
                            )}
                          </Alert>
                        </Grid>
                      </>
                    )}
                    {!checkIsExist && <Grid item xs={6}></Grid>}

                    <Grid item xs={3}>
                      <PatternFieldComp
                        name="telf"
                        label={t("Telephone Number")}
                        useplaceholder
                        control={control}
                        disabled={checkFieldRule("telf")}
                        format={phoneNumber}
                        isNumString={false}
                      />
                    </Grid>
                    <Grid item xs={3}>
                      <PatternFieldComp
                        name="fax"
                        label={t("Handphone Number")}
                        useplaceholder
                        control={control}
                        disabled={checkFieldRule("fax")}
                        format={phoneNumber}
                        isNumString={false}
                        tooltip={t("Gunakan format kode telfon internasional")}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextFieldComp
                        name="email"
                        label="Email *"
                        control={control}
                        t={t}
                        disabled={checkFieldRule("email")}
                        rules={{
                          required: "Please insert this field",
                          pattern: {
                            value: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g,
                            message: "invalid email address",
                          },
                        }}
                        toLowerCase={true}
                        tooltip={t(
                          "Diisikan email perusahaan atau email pribadi jika vendor perorangan"
                        )}
                      />
                    </Grid>

                    {/* {!checkFieldRule("search_term") && (
                      <Grid item xs={6}>
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
                    )} */}
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
                        disabled={
                          checkFieldRule("ispkp") ||
                          watch("ventype") == "OVERSEAS" ||
                          watch("ventype") == "GOVERNMENT"
                        }
                        onChangeovr={funChgIsPTKP}
                      />
                    </Grid>
                    <Grid item xs={12}></Grid>
                    <Grid item xs={2}>
                      <SwitchComponent
                        name="is_new_npwp"
                        control={control}
                        frontlabel={"16 Digit"}
                        backlabel={"Old"}
                        disabled={
                          checkFieldRule("is_new_npwp") ||
                          watch("ventype") == "OVERSEAS" ||
                          watch("ventype") == "GOVERNMENT"
                        }
                      />
                    </Grid>
                    <Grid item xs={4}>
                      {watch("is_new_npwp") == true && (
                        <NumericFieldComp
                          name="npwp"
                          t={t}
                          disabled={
                            checkFieldRule("npwp") ||
                            watch("ventype") == "OVERSEAS" ||
                            watch("ventype") == "GOVERNMENT"
                          }
                          rules={{
                            required:
                              watch("ventype") == "OVERSEAS" || watch("ventype") == "GOVERNMENT"
                                ? false
                                : "Please insert this field",
                            minLength: {
                              value: 16,
                              message: "Isi 16 digit",
                            },
                            maxLength: {
                              value: 16,
                              message: "Isi 16 digit",
                            },
                          }}
                          label={t("Tax Number") + " *"}
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
                          label={t("Tax Number") + " *"}
                          useplaceholder
                          format="##.###.###.#-###.###"
                          mask={"_"}
                          control={control}
                          disabled={
                            checkFieldRule("npwp") ||
                            watch("ventype") == "OVERSEAS" ||
                            watch("ventype") == "GOVERNMENT"
                          }
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
                              watch("ventype") == "OVERSEAS" || watch("ventype") == "GOVERNMENT"
                                ? false
                                : "Please insert this field",
                          }}
                        />
                      )}
                    </Grid>
                    {(!checkFieldRule("used_tax") || data_form.ticket_stat == false) && (
                      <Grid item xs={6}>
                        <SelectComp
                          name="used_tax"
                          t={t}
                          label={t("Used Tax") + " *"}
                          control={control}
                          options={UsedTaxOpt}
                          disabled={checkFieldRule("used_tax")}
                          rules={{
                            required: "Please insert this field",
                          }}
                        />
                      </Grid>
                    )}
                    {(!checkFieldRule("payterm") || data_form.ticket_stat == false) && (
                      <Grid item xs={6}>
                        <SelectComp
                          name="payterm"
                          t={t}
                          label={t("Payment Term") + " *"}
                          control={control}
                          options={PayTermOpt}
                          disabled={checkFieldRule("payterm")}
                          rules={{
                            required: "Please insert this field",
                          }}
                          tooltip={t("Jangka waktu pembayaran")}
                        />
                      </Grid>
                    )}
                    {(!checkFieldRule("paymthd") || data_form.ticket_stat == false) && (
                      <Grid item xs={3}>
                        <SelectComp
                          name="paymthd"
                          t={t}
                          label={t("Price Term") + " *"}
                          control={control}
                          options={PriceTermOpt}
                          disabled={checkFieldRule("paymthd")}
                          rules={{
                            required: "Please insert this field",
                          }}
                        />
                      </Grid>
                    )}
                  </Grid>
                </AccordionDetails>
              </Accordion>
              {checkIsExist && openAlert && (
                <Alert sx={{ mt: "2rem", mb: "2rem" }} severity="error" variant="filled">
                  {t("Already Exist")}
                </Alert>
              )}
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
                        disabled={checkFieldRule("website_url")}
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
                        disabled={checkFieldRule("ig_link")}
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
                        disabled={checkFieldRule("fb_link")}
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
                        disabled={checkFieldRule("twt_link")}
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
                        label={t("Director Name")}
                        control={control}
                        disabled={checkFieldRule("nama_direktur")}
                        toUpperCase={true}
                        rules={{
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
                        disabled={checkFieldRule("nama_pic")}
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
                        label={t("Handphone Number PIC *")}
                        useplaceholder
                        control={control}
                        disabled={checkFieldRule("no_telf_pic")}
                        format={phoneNumber}
                        isNumString={false}
                        rules={{ required: "Please insert this field" }}
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
                        disabled={checkFieldRule("email_pic")}
                        toLowerCase={true}
                        rules={{
                          required: "Please insert this field",
                          pattern: {
                            value: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g,
                            message: "invalid email address",
                          },
                          maxLength: { value: 500, message: "Max 500 Character" },
                        }}
                        tooltip={t("Alamat email pihak vendor yang berhubungan dengan KPN")}
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
                          {t("Address") + " *"}
                        </p>
                        <p
                          style={{
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
                          name="street"
                          t={t}
                          control={control}
                          maxLength={50}
                          disabled={checkFieldRule("street")}
                          rules={{
                            required: "Please insert this field",
                            maxLength: {
                              value: 50,
                              message: "Max 50 Character, continue to field below if not enough",
                            },
                            pattern: {
                              value: /^[^,]*$/,
                              message: t(`Please fill without ',' (comma) character`),
                            },
                          }}
                          toUpperCase={true}
                        />
                        <TextFieldComp
                          name="street2"
                          t={t}
                          control={control}
                          disabled={checkFieldRule("street2")}
                          rules={{
                            maxLength: {
                              value: 225,
                              message: "Max 225 Character, continue to field below if not enough",
                            },
                            pattern: {
                              value: /^[^,]*$/,
                              message: `Please fill without ',' (comma) character`,
                            },
                          }}
                          toUpperCase={true}
                        />
                        <TextFieldComp
                          name="street3"
                          t={t}
                          control={control}
                          disabled={checkFieldRule("street3")}
                          rules={{
                            maxLength: {
                              value: 225,
                              message: "Max 225 Character, continue to field below if not enough",
                            },
                            pattern: {
                              value: /^[^,]*$/,
                              message: `Please fill without ',' (comma) character`,
                            },
                          }}
                          toUpperCase={true}
                        />
                        <TextFieldComp
                          name="street4"
                          t={t}
                          control={control}
                          disabled={checkFieldRule("street4")}
                          rules={{
                            maxLength: { value: 225, message: "Max 225 Character" },
                            pattern: {
                              value: /^[^,]*$/,
                              message: `Please fill without ',' (comma) character`,
                            },
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
                        disabled={checkFieldRule("city")}
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
                        disabled={checkFieldRule("postal")}
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
              {(!checkFieldRule("vendetail") || data_form.ticket_stat == false) && (
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
                    <Alert variant="outlined" severity="warning" sx={{ mb: 1 }}>
                      {t("Perlu diisi oleh Procurement")}
                    </Alert>
                    <Grid container spacing={2}>
                      <Grid item xs={3}>
                        <SelectComp
                          name="ven_class"
                          t={t}
                          label="Vendor Class *"
                          control={control}
                          options={VenClassOpt}
                          disabled={checkFieldRule("ven_class")}
                          rules={{
                            required: "Please insert this field",
                          }}
                        />
                      </Grid>
                      <Grid item xs={3}>
                        <SelectComp
                          name="currency"
                          t={t}
                          label={t("Currency") + `${chgVenacc === "TRADE" ? " *" : ""}`}
                          control={control}
                          options={CurrencyOpt}
                          onChangeovr={funChgCurr}
                          disabled={checkFieldRule("currency")}
                          rules={{ required: "Please insert this field" }}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <TextFieldComp
                          t={t}
                          name="description"
                          label="Description *"
                          // helperText={t('Wajib diisi jika vendor mengikuti tender')}
                          control={control}
                          disabled={checkFieldRule("description")}
                          rules={{ required: "Please insert this field" }}
                          tooltip={t("Alasan memilih vendor tersebut menjadi rekanan KPN")}
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
                sx={{ zIndex: theme => theme.zIndex.drawer - 2 }}
              >
                <DialogTitle>{t("Reject Form")}</DialogTitle>
                <Box
                  sx={{
                    width: "40rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                    p: 2,
                    mb: 3,
                  }}
                >
                  <Alert severity="warning">
                    <AlertTitle>{t("Please provide rejection reasons")}</AlertTitle>{" "}
                    {t("Your current works will not be saved when rejecting form")}
                  </Alert>
                  <TextFieldComp
                    name="remarks"
                    label="remarks"
                    control={control1}
                    rules={{
                      required: "Please provide rejection reason",
                    }}
                    multiline
                  />
                </Box>
                <DialogActions>
                  <Button
                    type="submit"
                    color="error"
                    variant="contained"
                    onClick={handleSubmit1(handleReject)}
                  >
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
                {!checkFieldRule("add_bank") && (
                  <LoadingButton
                    onClick={e => {
                      handleAddNewBank();
                    }}
                    loading={loadAddBank}
                  >
                    + Add Bank
                  </LoadingButton>
                )}
                {errors.bank && <p style={{ color: "red" }}>{t("Please insert this field")}</p>}
                <VenBankTableRefactor
                  control={control}
                  fields={fields}
                  append={append}
                  remove={remove}
                  getValues={getValues}
                  currencies={CurrencyOpt}
                  watch={watch}
                  is_allow={!checkFieldRule("add_bank")}
                  t={t}
                  ven_id={loader_data.ven_id}
                  clearField={resetField}
                  setValue={setValue}
                />
              </AccordionDetails>
            </Accordion>
            <Accordion
              expanded={expanded.panelFile}
              onChange={e => {
                toggle({ type: FormTab.File });
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
                <Typography>{t("File Upload")}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Alert
                  severity="warning"
                  variant="filled"
                  sx={{ minWidth: "20rem", mt: "1rem", mb: "1rem" }}
                >
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    {t("Please Download")}
                    <Link
                      href={
                        langCode === "id"
                          ? `${
                              import.meta.env.VITE_URL_LOC
                            }/master/file/Kode_Etik_Supplier_Vendor_dan_Kontraktor.doc`
                          : `${
                              import.meta.env.VITE_URL_LOC
                            }/master/file/Integrity_Pact_Supplier_Vendor_and_Contractor.docx`
                      }
                    >
                      Link Download File Pakta Integritas
                    </Link>
                  </Box>
                </Alert>
                {!checkFieldRule("upload_file") && (
                  <Alert
                    severity="warning"
                    variant="filled"
                    sx={{ minWidth: "20rem", mt: "1rem", mb: "1rem" }}
                  >
                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                      {t("Please Download Justifikasi")}
                      <Link
                        href={`${
                          import.meta.env.VITE_URL_LOC
                        }/master/file/Form_VENDOR_LOCAL_JUSTIFIKASI.docx`}
                      >
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
                  allow={!checkFieldRule("upload_file")}
                  deleteFile={deleteVenFile}
                  requiredFiles={errors && Object.values(errors.file_atth ?? {})}
                  ref={uploadButRef}
                  fileCheck={fileCheck}
                  t={t}
                  langCode={langCode}
                  ticketState={ticketState}
                />
              </AccordionDetails>
            </Accordion>
            {(!checkFieldRule("vendorcode") || data_form.ticket_stat == false) && (
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
                        readOnly={true}
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            )}
            {loader_data.logrej_counter !== null && (
              <Accordion
                expanded={expanded.panelRejectLog}
                onChange={e => {
                  toggle({ type: FormTab.RejectLog });
                }}
                TransitionProps={{ unmountOnExit: true }}
              >
                <AccordionSummary
                  sx={{ pointerEvents: "none" }}
                  expandIcon={<ExpandMoreIcon sx={{ pointerEvents: "auto" }} />}
                >
                  <Typography>{t("Rejection Log")}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ my: 5, backgroundColor: "white", borderRadius: "12px" }}>
                    {/* <TextFieldComp name="remarks_disabled" label="Rejection Remarks" control={control} disabled={true} /> */}
                    <RejectLog ticket_id={loader_data.ticket_id} ticket_state={ticketState} />
                  </Box>
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
                {!checkFieldRule("draft") && (
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
                    {t("Save Draft")}
                  </Button>
                )}
                {!checkFieldRule("reject") && (
                  <Button
                    sx={{ height: 50, width: 100, margin: 2 }}
                    color="error"
                    variant="contained"
                    onClick={() => {
                      setModalopen(true);
                    }}
                  >
                    {t("Reject")}
                  </Button>
                )}
                {!checkFieldRule("submit") && (
                  <Button
                    sx={{ height: 50, width: 100, margin: 2 }}
                    variant="contained"
                    type="submit"
                    onClick={() => {
                      // console.log(testSubmitForm());
                      handleSubmit(value => {
                        // console.log(value);
                        is_draft.current = false;
                        submitForm(value);
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
          {console.log(emp_role_id)}
          <Snackbar
            open={
              loader_data.ticket_type == "CREATE_NEW_VENDOR_CG" &&
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
          <Backdrop sx={{ color: "#fff", zIndex: theme => theme.zIndex.drawer + 1 }} open={loading}>
            <CircularProgress color="inherit" disableShrink />
          </Backdrop>
          <Dialog open={formStat.stat && formStat.type === "success" && is_draft.current == false}>
            <Box
              sx={{
                width: 500,
                height: 200,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "success.main",
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
            sx={{ zIndex: theme => theme.zIndex.drawer - 2 }}
            confirmText={`You're about to send this form to CEO/CFO, are you sure ?`}
            t={t}
          />
        </Container>
      </AuthorizeTipTopProvider>
    </>
  );
}

export default FormVendorCG;
