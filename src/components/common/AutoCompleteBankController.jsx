import useAxiosPrivate from 'src/hooks/useAxiosPrivate';
import ModalCreateBank from './ModalCreateBank';
import { useEffect, useState } from 'react';
import AutoCompleteCustomController from './AutoCompleteCustomController ';

export default function AutoCompleteBankController(params) {
  const country = params.getValues(`bank.${params.index}.bank_country`);
  const axiosPrivate = useAxiosPrivate();
  const [banksData, setBanksdata] = useState([{ value: '', label: '' }]);
  const [modalOpen, setModalOpen] = useState(false);
  const [bankName, setBankName] = useState('');
  const newAddModal = (item) => {
    setBankName(item);
    setModalOpen(true);
  };
  const handleClose = () => {
    setModalOpen(false);
  };

  const modalAccess = (item) => {
    setModalOpen(item);
  };
  useEffect(() => {
    const controller = new AbortController();
    const getBanks = async () => {
      if (country?.value) {
        try {
          const bdata = await axiosPrivate.get(`/master/banksap?country=${country.value}`, {
            signal: controller.signal,
          });
          const response = bdata.data;
          const result = response.data;
          const databank = result?.map((item) => ({
            value: item.id,
            label: `${item.bank_name} (${item.bank_code}) ${item.source != null ? '(new)' : ''}`,
          }));
          setBanksdata(databank);
        } catch (error) {
          console.log(error);
          alert(error.stack);
        }
      }
    };
    getBanks();
    return () => {
      controller.abort;
    };
  }, [country, params.watch(`bank.${params.index}.bank_country`)]);

  return (
    <>
      <ModalCreateBank
        openModal={modalOpen}
        handleClose={handleClose}
        setModalopen={modalAccess}
        typepost={'insert'}
        bankname={bankName}
        country_code={country?.value}
        setValue={params?.setValue}
        fieldName={`bank.${params.index}.bank_id`}
        limited={true}
        params={params}
      />
      <AutoCompleteCustomController
        {...params}
        options={banksData}
        addnew={true}
        country={country}
        newAddModal={newAddModal}
      />
    </>
  );
}
