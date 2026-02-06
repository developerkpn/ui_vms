import { useEffect, useContext, createContext, useState } from "react";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import { useLoaderData } from "react-router-dom";
import CoupaForm from "./CoupaForm";

const FormDt = createContext(null);

export default function DirectCoupaForm() {
  const axiosPrivate = useAxiosPrivate();
  const predata = useLoaderData();
  const [formData, setFormData] = useState({});
  useEffect(() => {
    let link = `/coupa/vendor/detail`;
    (async () => {
      try {
        const body = {
          id: predata.id
        };
        const { data } = await axiosPrivate.post(link, body);
        setFormData({ ...data.data });
      } catch (error) {
        console.error(error);
      }
    })();
  }, [predata]);
  return (
    <FormDt.Provider value={{ formData, coupa_id: predata.id }}>
      <CoupaForm />
    </FormDt.Provider>
  );
}

export const useFormCoupa = () => useContext(FormDt);
