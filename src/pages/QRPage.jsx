import { Container } from '@mui/material';
import axios from 'axios';
import { useEffect, useState } from 'react';

export default function QRPage() {
  const [qrcode, setQr] = useState('');

  useEffect(() => {
    const getQr = async () => {
      const qr = await axios.get(`${import.meta.env.VITE_URL_LOC}/master/genqr`);
      const data = qr.data.qr;
      setQr(data);
    };
    getQr();
  }, []);

  return (
    <>
      <Container>
        <img src={qrcode} />
      </Container>
    </>
  );
}
