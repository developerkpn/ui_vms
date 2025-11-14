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
import usePermissionStore from "src/store/userPermissionStore";
import { useFormCreateNew } from "./create_new/DirectFormCreateNew";

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
  // RELATED: [
  //   { value: 'MATERIAL', label: 'Material' },
  //   { value: 'CONTRACTOR', label: 'Contractor' },
  //   { value: 'INSURANCE', label: 'Insurance' },
  //   { value: 'OTHER', label: 'Other' },
  //   { value: 'TRANSPORTER', label: 'Transporter' },
  // ],
  BANK: [{ value: "X", label: "X" }],
  SHAREHOLDERS: [{ value: "X", label: "X" }],
  // EMPLOYEE: [{ value: 'X', label: 'X' }],
  // INTERDIVISION: [{ value: 'X', label: 'X' }],
};

function RefactorFormVendorPage() {
  const data_form = useFormCreateNew();
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
    remarks_readOnly: "",
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

      const { data: bankInit } = await axiosPrivate.get(
        `/vendor/bank/${data_form.ven_id === null ? data.ticket_ven_id : data.ven_id}`,
        { signal: controller.signal }
      );
      const resultBank = bankInit.data;
      console.log("data", data);
      const valueForm = {
        emailRequestor: data.email_proc ? data.email_proc : "",
        deptRequestor: data.dep_proc ? data.dep_proc : "",
        titlecomp: data.title ? data.title : "",
        localovs: data.local_ovs ? data.local_ovs : "",
        name1: data["name_1"] ? data["name_1"] : "",
        kawasan_berikat: data?.kawasan_berikat,
        country: data.country ? data.country : "",
        street: data.street ? data.street : "",
        street2: data.street2 ? data.street2 : "",
        street3: data.street3 ?? "",
        street4: data.street4 ?? "",
        postal: data.postal ? data.postal : "",
        city: data.city ? data.city : "",
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
        telf: data.telf1 ? data.telf1 : "",
        fax: data.fax ? data.fax : "",
        email: data.email ? data.email : "",
        ispkp: data.is_pkp ? data.is_pkp : false,
        is_new_npwp: data.is_new_npwp ?? false,
        npwp: data.npwp ? data.npwp : "",
        paymthd: data.pay_mthd ? data.pay_mthd : "",
        payterm: data.pay_term ? data.pay_term : "I30",
        ppn_type: data.ppn_type ? data.ppn_type : "VAT_11",
        company: data.company ? data.company : "",
        purchorg: data.purch_org ? { value: data.purch_org, label: data.purch_org } : null,
        vengroup: data.ven_group ? data.ven_group : "",
        venacc: data.ven_acc ? data.ven_acc : "",
        ventype: data.ven_type ? data.ven_type : "",
        currency: data.lim_curr ? data.lim_curr : "",
        description: data.description ? data.description : "",
        is_tender: data.is_tender ? data.is_tender : false,
        is_priority: data.is_priority ? data.is_priority : false,
        is_interest: data.is_interest ? data.is_interest : false,
        vendorcode: data.ven_code ? data.ven_code : data.header,
        remarks_readOnly: data.remarks ? data.remarks : "",
        remarks: "",
        limit: data.limit_vendor ? data.limit_vendor : "",
        reject_by: data.reject_by ? data.reject_by : "",
        search_term: data.search_term ? data.search_term : "",
        is_active: data.ticket_stat,
        website_url: data.website_url ?? "",
        ig_link: data.ig_link ?? "",
        fb_link: data.fb_link ?? "",
        twt_link: data.twt_link ?? "",
        nama_direktur: data.nama_direktur ?? "",
        nama_pic: data.nama_pic ?? "",
        no_telf_pic: data.no_telf_pic ?? "",
        email_pic: data.email_pic ?? "",
        email_fin: data.email_fin ?? "",
        bank: resultBank.map(item => ({
          id: item.id,
          bank_country: { value: item.country, label: item.country },
          bank_id: item.bank_id
            ? {
                value: item.bank_id,
                label: `${item.bank_name} (${item.bank_code})${
                  item.source === "form" ? " - (new)" : ""
                }`,
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
  const [currentEdit, setCurrentEdit] = useState([]);
  const [phoneNumber, setPhnNum] = useState("+XX");
  const [fileType, setFileType] = useState([]);
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
  const funChgIsPTKP = useCallback(item => {
    setIsPTKP(item);
  }, []);
  const funChgComp = useCallback(item => {
    setChgComp(item);
    resetField("purchorg");
  }, []);

  const sameWithAddrComp = useCallback(fields => {
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

  const checkExist = useCallback(async item => {
    setLoadex(true);
    try {
      const checkExt = await axiosPrivate.get(`/vendor/checkven?name=${item}&bu_id=UPS`);
      // console.log(checkExt);
      setCheckex(false);
      // console.log(expanded);
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
    console.log(loader_data);
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
    if (compTitle !== "" && chgLocal !== "" && compTitle && chgLocal) {
      (async () => {
        try {
          unregister("file_atth");
          const { data } = await axiosPrivate.get(
            `/master/filetype?title=${compTitle}&ventype=${chgLocal}&bu_id=${data_form.bu_ticket_type}&curpos=${data_form.emp_role_id}`,
            {
              signal: controller.signal,
            }
          );
          data.data.forEach(item => {
            if (isTender && item.file_code == "A010") {
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
              .filter(element => element.file_type === item.file_code)
              .map(item => item.file_name);
            if (fileInit) {
              setValue(`file_atth.${item.file_code}`, fileInit[0]);
            }
          });
          setFileType(
            data.data.map(item => {
              if (isTender && item.file_code == "A010") {
                return {
                  key: item.file_code,
                  value: `${t(item.file_type)} * `,
                  help: langCode === "id" ? item.help : item.helpen,
                  need_exp_date: item.need_exp_date,
                };
              }
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
  }, [compTitle, langCode, chgLocal, loader_data, t, isTender, fields, initDataFile, data_form]);

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
      setFocus("description");
    }
  }, [isTender]);

  useEffect(() => {
    if (watch("is_interest") == true) {
      setValue("is_priority", false);
    }
  }, [watch("is_interest")]);

  const navigate = useNavigate();
  const permission = usePermissionStore(state => state.permission);
  const ticketState = useMemo(() => loader_data?.ticketState, [loader_data]);
  const is_active = useMemo(() => loader_data.data?.is_active, [loader_data]);
  const countrycode = useRef(loader_data.data?.country);

  const countries = useRef([{ value: "", label: "" }]);
  const [currencies, setCurr] = useState([]);
  const allCurr = useRef([]);
  // const cities = useRef([{ value: '', label: '' }]);
  const banks = useRef([{ value: "", label: "" }]);
  const payterm = useRef([{ value: "", label: "" }]);
  const comps = useRef([{ value: "", label: "" }]);
  const ppn_type = useRef([{ value: "", label: "" }]);
  const uploadButRef = useRef(null);
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
        // console.log(result.data);
        // console.log(loader_data.data);
        if (loader_data.data.bunit) {
          if (
            loader_data.data.bunit === "CREATE_NEW_VENDOR_UPS" ||
            loader_data.data.bunit === "CREATE_NEW_VENDOR_UPS_USR"
          ) {
            comps.current = { UPSTREAM: result.data["UPSTREAM"] };
          } else {
            comps.current = { DOWNSTREAM: result.data["DOWNSTREAM"] };
          }
        }
      } catch (error) {
        console.error(error);
        // alert(error.stack);
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

  const setVen_fileFromChild = useCallback(newItem => {
    if (newItem.length > 0) {
      newItem.forEach(item => {
        setValue(`file_atth.${item.file_type}`, item.file_name);
      });
      setVen_file(newItem);
    }
  }, []);

  const deleteVenFile = deletedFile => {
    resetField(`file_atth.${deletedFile?.file_type}`);
  };

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

  // useEffect(() => {
  //   console.log(currentEdit);
  //   Object.keys(currentEdit).map((item) => {
  //     console.log(apiRef.current.getCellElement(item, 'action').children[0].firstElementChild.getAttribute('id'));
  //   });
  // }, [currentEdit]);

  const submitForm = async value => {
    // setBtnclick(true);
    const controller = new AbortController();
    const filteredVenFile = ven_file.filter(item => item.method !== "");
    const ven_detail = {
      ven_id: loader_data.ven_id,
      ticket_num: loader_data.ticket_num,
      title: value.titlecomp,
      name_1: value.name1,
      local_ovs: value.localovs,
      postal: value.postal.trim(),
      country: value.country,
      city: typeof value.city === "object" ? value.city.value : value.city,
      street: value.street,
      street2: value.street2,
      street3: value.street3,
      street4: value.street4,
      postal_npwp: value.postal_npwp.trim(),
      city_npwp: typeof value.city_npwp === "object" ? value.city_npwp.value : value.city_npwp,
      street_npwp: value.street_npwp,
      street2_npwp: value.street2_npwp,
      street3_npwp: value.street3_npwp,
      street4_npwp: value.street4_npwp,
      postal_sppkp: value.postal_sppkp.trim(),
      city_sppkp: typeof value.city_sppkp === "object" ? value.city_sppkp.value : value.city_sppkp,
      street_sppkp: value.street_sppkp,
      street2_sppkp: value.street2_sppkp,
      street3_sppkp: value.street3_sppkp,
      street4_sppkp: value.street4_sppkp,
      telf1: value.telf.trim().split(/-/)[1],
      fax: value.fax.trim().split(/-/)[1],
      email: value.email,
      is_new_npwp: value.is_new_npwp,
      is_pkp: value.ispkp,
      is_tender: value.is_tender,
      is_priority: value.is_priority,
      is_interest: value.is_interest,
      npwp: value.npwp.trim(),
      pay_mthd: value.paymthd,
      pay_term: value.payterm,
      ppn_type: value.ppn_type,
      company: value.company,
      purch_org: value.purchorg?.value,
      ven_acc: value.venacc,
      ven_group: value.vengroup,
      ven_type: value.ventype,
      description: value.description,
      limit_vendor: value.limit.toString().match(/\d+/g)?.join(""),
      lim_curr: value.currency,
      ven_code: value.vendorcode,
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
      kawasan_berikat: value.kawasan_berikat,
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
            {`Form Vendor Registration ${loader_data.ticket_num}`}
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
                      name="titlecomp"
                      label={t("Title") + " *"}
                      control={control}
                      t={t}
                      disabled={checkFieldRule("titlecomp")}
                      onChangeovr={funChgTitle}
                      options={title}
                      rules={{ required: "Please insert this field" }}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <SelectComp
                      name="localovs"
                      label={t("Local/Overseas") + " *"}
                      t={t}
                      control={control}
                      disabled={checkFieldRule("localovs")}
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
                      disabled={checkFieldRule("country") || chgLocal === "LOCAL"}
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
                      disabled={checkFieldRule("name1")}
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
                      <Grid item xs={12}>
                        <Alert variant="filled" severity="warning">
                          {t(
                            "Untuk melanjutkan, mohon klik verifikasi apakah nama vendor yang diisi sudah terdaftar"
                          )}
                        </Alert>
                      </Grid>
                    </>
                  )}
                  {!checkIsExist && <Grid item xs={3}></Grid>}
                  {checkIsExist && openAlert && (
                    <Grid item xs={12}>
                      <Alert severity="error" variant="filled">
                        {t("Already Exist")}
                      </Alert>
                    </Grid>
                  )}
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
                  <Grid item xs={3}>
                    <CheckboxComp
                      name="kawasan_berikat"
                      label="Kawasan Berikat"
                      control={control}
                      disabled={checkFieldRule("kawasan_berikat")}
                    />
                  </Grid>
                  {!checkFieldRule("search_term") && (
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
                  )}
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
                      label={t("Director Name") + " *"}
                      control={control}
                      disabled={checkFieldRule("nama_direktur")}
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
                      label={t("Handphone Number PIC")}
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
                  <Grid item xs={6}>
                    <TextFieldComp
                      name="email_fin"
                      t={t}
                      label={t("Email Finance") + " *"}
                      control={control}
                      disabled={checkFieldRule("email_fin")}
                      toLowerCase={true}
                      rules={{
                        required: "Please insert this field",
                        pattern: {
                          value: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g,
                          message: "invalid email address",
                        },
                        maxLength: { value: 500, message: "Max 500 Character" },
                      }}
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
                      <p
                        style={{
                          fontSize: "8pt",
                          margin: "0",
                          color: theme.palette.grey[600],
                        }}
                      >
                        {`Max 35 ${t("Karakter")} ${t(
                          `Please fill without ',' (comma) character`
                        )} ${t(`Mohon dilanjutkan ke kolom berikutnya jika tidak cukup`)}`}
                      </p>
                      <TextFieldComp
                        name="street"
                        t={t}
                        control={control}
                        maxLength={35}
                        disabled={checkFieldRule("street")}
                        rules={{
                          required: "Please insert this field",
                          maxLength: {
                            value: 35,
                            message: "Max 35 Character, continue to field below if not enough",
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
                            value: 35,
                            message: "Max 35 Character, continue to field below if not enough",
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
                            value: 35,
                            message: "Max 35 Character, continue to field below if not enough",
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
                          maxLength: { value: 35, message: "Max 35 Character" },
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
                {!checkFieldRule("street_npwp") && (
                  <Button onClick={e => sameWithAddrComp("npwp")}>
                    {t("Same as Company Address")}
                  </Button>
                )}
                <h4>
                  <em>{t("Isi bagian ini jika berbeda dengan alamat domisili perusahaan")}</em>
                </h4>
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
                        name="street_npwp"
                        t={t}
                        control={control}
                        disabled={checkFieldRule("street_npwp")}
                        rules={{
                          required: "Please insert this field",
                          maxLength: {
                            value: 35,
                            message: "Max 35 Character, continue to field below if not enough",
                          },
                          pattern: {
                            value: /^[^,]*$/,
                            message: `Please fill without ',' (comma) character`,
                          },
                        }}
                        toUpperCase={true}
                      />
                      <TextFieldComp
                        name="street2_npwp"
                        t={t}
                        control={control}
                        disabled={checkFieldRule("street2_npwp")}
                        rules={{
                          maxLength: {
                            value: 35,
                            message: "Max 35 Character, continue to field below if not enough",
                          },
                          pattern: {
                            value: /^[^,]*$/,
                            message: `Please fill without ',' (comma) character`,
                          },
                        }}
                        toUpperCase={true}
                      />
                      <TextFieldComp
                        name="street3_npwp"
                        t={t}
                        control={control}
                        disabled={checkFieldRule("street3_npwp")}
                        rules={{
                          maxLength: {
                            value: 35,
                            message: "Max 35 Character, continue to field below if not enough",
                          },
                          pattern: {
                            value: /^[^,]*$/,
                            message: `Please fill without ',' (comma) character`,
                          },
                        }}
                        toUpperCase={true}
                      />
                      <TextFieldComp
                        name="street4_npwp"
                        t={t}
                        control={control}
                        disabled={checkFieldRule("street4_npwp")}
                        rules={{
                          maxLength: { value: 35, message: "Max 35 Character" },
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
                      name="city_npwp"
                      t={t}
                      label={t("City") + " *"}
                      control={control}
                      disabled={checkFieldRule("city_npwp")}
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
                      disabled={checkFieldRule("postal_npwp")}
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
                {!checkFieldRule("street_sppkp") && (
                  <Button onClick={e => sameWithAddrComp("sppkp")}>
                    {t("Same as Company Address")}
                  </Button>
                )}
                <h4>
                  <em>{t("Isi bagian ini jika berbeda dengan alamat domisili perusahaan")}</em>
                </h4>

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
                        disabled={checkFieldRule("street_sppkp")}
                        rules={{
                          required: "Please insert this field",
                          maxLength: {
                            value: 35,
                            message: "Max 35 Character, continue to field below if not enough",
                          },
                          pattern: {
                            value: /^[^,]*$/,
                            message: `Please fill without ',' (comma) character`,
                          },
                        }}
                        toUpperCase={true}
                      />
                      <TextFieldComp
                        name="street2_sppkp"
                        t={t}
                        control={control}
                        disabled={checkFieldRule("street2_sppkp")}
                        rules={{
                          maxLength: {
                            value: 35,
                            message: "Max 35 Character, continue to field below if not enough",
                          },
                          pattern: {
                            value: /^[^,]*$/,
                            message: `Please fill without ',' (comma) character`,
                          },
                        }}
                        toUpperCase={true}
                      />
                      <TextFieldComp
                        name="street3_sppkp"
                        t={t}
                        control={control}
                        disabled={checkFieldRule("street3_sppkp")}
                        rules={{
                          maxLength: {
                            value: 35,
                            message: "Max 35 Character, continue to field below if not enough",
                          },
                          pattern: {
                            value: /^[^,]*$/,
                            message: `Please fill without ',' (comma) character`,
                          },
                        }}
                        toUpperCase={true}
                      />
                      <TextFieldComp
                        name="street4_sppkp"
                        t={t}
                        control={control}
                        disabled={checkFieldRule("street4_sppkp")}
                        rules={{
                          maxLength: { value: 35, message: "Max 35 Character" },
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
                      name="city_sppkp"
                      t={t}
                      label={t("City")}
                      control={control}
                      disabled={checkFieldRule("city_sppkp")}
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
                      disabled={checkFieldRule("postal_sppkp")}
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
                      disabled={checkFieldRule("ispkp")}
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
                      disabled={checkFieldRule("npwp")}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    {watch("is_new_npwp") == true && (
                      <NumericFieldComp
                        name="npwp"
                        t={t}
                        disabled={checkFieldRule("npwp")}
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
                        disabled={
                          checkFieldRule("npwp") ||
                          watch("ventype") == "OVERSEAS" ||
                          watch("ventype") == "INTERCOMPANY"
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
                            watch("localovs") == "LOCAL" ? "Please insert this field" : false,
                        }}
                      />
                    )}
                  </Grid>
                  <Grid item xs={3}>
                    <SelectComp
                      name="paymthd"
                      t={t}
                      label={t("Payment Method") + " *"}
                      control={control}
                      options={[
                        { value: "bank", label: "Bank" },
                        { value: "cash", label: "Cash" },
                        { value: "Giro", label: "Giro" },
                      ]}
                      disabled={checkFieldRule("paymthd")}
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
                      disabled={checkFieldRule("payterm")}
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
                      disabled={checkFieldRule("ppn_type")}
                      rules={{
                        required: "Please insert this field",
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
                  <Alert variant="outlined" severity="warning" sx={{ mb: 1 }}>
                    {t("Perlu diisi oleh Procurement")}
                  </Alert>
                  <Grid container spacing={2}>
                    <Grid item xs={5}>
                      <SelectComp
                        name="company"
                        t={t}
                        label={t("Company") + " *"}
                        control={control}
                        options={comps.current}
                        disabled={checkFieldRule("company")}
                        rules={{
                          required: "Please insert this field",
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
                        disabled={checkFieldRule("purchorg")}
                        rules={{
                          required: "Please insert this field",
                        }}
                        company={chgComp}
                        t={t}
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
                        disabled={checkFieldRule("vengroup")}
                        rules={{
                          required: "Please insert this field",
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
                          { value: "TRADE", label: "Trade" },
                          { value: "NON_TRADE", label: "Non Trade" },
                        ]}
                        onChangeovr={funChgVacc}
                        disabled={checkFieldRule("venacc")}
                        rules={{
                          required: "Please insert this field",
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
                          chgVenacc !== "NON_TRADE"
                            ? [{ value: "X", label: "X" }]
                            : ventypeList[chgVengrp]
                            ? ventypeList[chgVengrp]
                            : [{ value: "X", label: "X" }]
                        }
                        disabled={checkFieldRule("ventype")}
                        rules={{
                          required: "Please insert this field",
                        }}
                      />
                    </Grid>
                    <Grid item xs={3}></Grid>
                    <Grid item xs={3}>
                      <SelectComp
                        name="currency"
                        t={t}
                        label={t("Limit Currency") + `${chgVenacc === "TRADE" ? " *" : ""}`}
                        control={control}
                        options={currencies}
                        onChangeovr={funChgCurr}
                        disabled={chgVenacc === "NON_TRADE" || checkFieldRule("currency")}
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
                        disabled={chgVenacc === "NON_TRADE" || checkFieldRule("limit")}
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
                        disabled={checkFieldRule("is_tender")}
                        onChangeovr={funChgTdr}
                      />
                      <CheckboxComp
                        name="is_priority"
                        label={t("Vendor Priority")}
                        control={control}
                        disabled={checkFieldRule("is_priority") || watch("is_interest") == true}
                      />
                      <CheckboxComp
                        name="is_interest"
                        label={t("Interest Payment Priority")}
                        control={control}
                        disabled={checkFieldRule("is_interest")}
                      />
                    </Grid>
                    {(watch("is_interest") || watch("is_tender") || watch("is_priority")) &&
                      emp_role_id == "STAFF" && (
                        <Grid item xs={12}>
                          <Alert severity="warning">
                            <h3>
                              {t(
                                "This form request need approval from C Level, Please make clear description carefully"
                              )}
                            </h3>
                          </Alert>
                        </Grid>
                      )}
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
                countries={countries.current}
                currencies={currencies}
                watch={watch}
                is_local={chgLocal === "LOCAL"}
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
    </>
  );
}

export default RefactorFormVendorPage;
