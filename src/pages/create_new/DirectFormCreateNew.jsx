import { useEffect, useContext, createContext, useState } from "react";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import { useLoaderData } from "react-router-dom";
import RefactorFormVendorPage from "../RefactorFormVendorPagev2";
import FormVendorCG from "../FormVendorCG";

const FormDt = createContext(null);

export default function DirectFormCreateNew() {
  const axiosPrivate = useAxiosPrivate();
  const predata = useLoaderData();
  const [formData, setFormData] = useState({});
  useEffect(() => {
    let link = `/ticket`;
    if (predata.type == "new") {
      link += "/newform/" + predata.token;
    } else {
      link += "/form/" + predata.token;
    }
    (async () => {
      try {
        const { data } = await axiosPrivate.get(link);
        console.log(data);
        setFormData({ ...data.data, type: predata.type });
      } catch (error) {
        console.error(error);
      }
    })();
  }, [predata]);
  return (
    <FormDt.Provider value={formData}>
      {(formData.bu_ticket_type == "DWS" ||
        formData.bu_ticket_type == "UPS") && <RefactorFormVendorPage />}
      {formData.bu_ticket_type == "CG" && <FormVendorCG />}
    </FormDt.Provider>
  );
}

export const useFormCreateNew = () => useContext(FormDt);
