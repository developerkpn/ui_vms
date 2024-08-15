import axios from 'axios';
import useAxiosPrivate from 'src/hooks/useAxiosPrivate';
import AutoCompleteCustom from './AutoCompleteCustom';
import ModalCreateBank from './ModalCreateBank';
import { useEffect, useState } from 'react';

export default function AutoCompleteBank(params) {
  const country = params.row.country?.value;
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
      try {
        const bdata = await axiosPrivate.get(`/master/banksap?country=${country}`, { signal: controller.signal });
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
    };
    getBanks();
    return () => {
      controller.abort;
    };
  }, [country]);

  return (
    <>
      <ModalCreateBank
        openModal={modalOpen}
        handleClose={handleClose}
        setModalopen={modalAccess}
        typepost={'insert'}
        bankname={bankName}
        country_code={country}
        limited={true}
        params={params}
      />
      <AutoCompleteCustom {...params} options={banksData} addnew={true} country={country} newAddModal={newAddModal} />
    </>
  );
}
