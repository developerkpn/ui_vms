import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import ModalCreateBank from "./ModalCreateBankCG";
import { useEffect, useState } from "react";
import AutoCompleteCustomController from "./AutoCompleteCustomController ";

export default function AutoCompleteBankControllerCG(params) {
  const axiosPrivate = useAxiosPrivate();
  const [banksData, setBanksdata] = useState([{ value: "", label: "" }]);
  const [modalOpen, setModalOpen] = useState(false);
  const [bankName, setBankName] = useState("");
  const newAddModal = item => {
    setBankName(item);
    setModalOpen(true);
  };
  const handleClose = () => {
    setModalOpen(false);
  };

  const modalAccess = item => {
    setModalOpen(item);
  };
  useEffect(() => {
    const controller = new AbortController();
    const getBanks = async () => {
      try {
        const { data } = await axiosPrivate.get(`/master/cg/banks`, {
          signal: controller.signal,
        });
        const result = data.data;
        const databank = result?.map(item => ({
          value: item.bank_code,
          label: `${item.bank_name} (${item.bank_code}) ${
            item.is_new ? "(new)" : ""
          }`,
        }));
        setBanksdata(databank);
      } catch (error) {
        console.log(error);
        alert(error.stack);
      }
    };
    getBanks();
    return () => {
      controller.abort;
    };
  }, [modalOpen]);

  return (
    <>
      <ModalCreateBank
        openModal={modalOpen}
        handleClose={handleClose}
        setModalopen={modalAccess}
        typepost={"insert"}
        bankname={bankName}
        setValue={params?.setValue}
        fieldName={`bank.${params.index}.bank_id`}
        params={params}
      />
      <AutoCompleteCustomController
        {...params}
        options={banksData}
        addnew={true}
        newAddModal={newAddModal}
      />
    </>
  );
}
