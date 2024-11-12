import { useForm } from 'react-hook-form';
import AutoCompleteSelect from 'src/components/common/AutoCompleteSelect';
import { TextFieldComp } from 'src/components/common/TextFieldComp';
import PatternFieldComp from 'src/components/common/PatternFieldComp';
import SelectComp from 'src/components/common/SelectComp';
import { useSearchParams } from 'react-router-dom';
import { Box, Backdrop, CircularProgress } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { useTheme } from '@mui/material/styles';
import VenFileTablev2 from './VenFileTablev2';
import { useEffect, useRef, useState } from 'react';
import HeaderSection from 'src/components/common/HeaderSection';
import { useTranslation } from 'react-i18next';
import useAxiosPrivate from 'src/hooks/useAxiosPrivate';
import { useSnackBar } from 'src/provider/SnackbarProvider';
import useFileStore from 'src/store/useFileStore';
import { MapperPayloadReqEdit } from 'src/helper/Mapper';
import { useNavigate } from 'react-router-dom';
import useTimeout from 'src/hooks/useTimeout';

export default function FormReqEditDet() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setHookTimeout } = useTimeout();
  const ticketHeader = useRef();
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const [id, setId] = useState('');
  const [disabled, setDisabled] = useState([]);
  const [phoneNumber, setPhoneNumber] = useState('+XX');
  const [payterm, setPayterm] = useState([]);
  const [cities, setCities] = useState([]);
  const [initFiles, setInitFiles] = useState([]);
  const [isSubmit, setSubmit] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const axiosPrivate = useAxiosPrivate();
  const { openSnackbar } = useSnackBar();
  const setFileTypes = useFileStore((state) => state.setFileTypes);
  const fileChanged = useFileStore((state) => state.changesFiles);
  const setAlltoServer = useFileStore((state) => state.setAlltoServer);
  const {
    control,
    handleSubmit,
    reset,
    register,
    getValues,
    setValue,
    trigger,
    formState: { dirtyFields, errors },
  } = useForm({
    defaultValues: {
      telf1: '',
      fax: '',
      email: '',
      website_url: '',
      ig_link: '',
      fb_link: '',
      twt_link: '',
      nama_direktur: '',
      nama_pic: '',
      no_telf_pic: '',
      email_pic: '',
      email_fin: '',
      street_npwp: '',
      street2_npwp: '',
      street3_npwp: '',
      street4_npwp: '',
      city_npwp: '',
      postal_npwp: '',
      street_sppkp: '',
      street2_sppkp: '',
      street3_sppkp: '',
      street4_sppkp: '',
      city_sppkp: '',
      postal_sppkp: '',
      street: '',
      street2: '',
      street3: '',
      street4: '',
      city: '',
      postal: '',
      pay_mthd: '',
      pay_term: '',
      company: '',
      purch_org: '',
      lim_curr: '',
      limit_vendor: '',
      files: [],
    },
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axiosPrivate.get(`/ticeddet/view?id=${searchParams.get('id')}`);
        ticketHeader.current = data.ticket;
        const det = data.vendor.detail;
        const stg = data.vendor.detail_staged;
        const files = data.vendor.files;
        const changes = data.vendor.changes;
        setInitFiles(files);
        let defValFile = {};
        for (const file of files) {
          defValFile[file.file_type] = file.file_name;
        }
        reset({
          ...det,
          telf1: `+${det.code_prefix}-${det.telf1.padEnd(16, ' ')}`,
          fax: `+${det.code_prefix}-${det.fax.padEnd(16, ' ')}`,
          no_telf_pic: `+${det.code_prefix}-${det.no_telf_pic.padEnd(16, ' ')}`,
          postal: det.postal.padEnd(5, ' '),
          postal_npwp: det.postal_npwp.padEnd(5, ' '),
          postal_sppkp: det.postal_sppkp.padEnd(5, ' '),
          files: defValFile,
        });
        for (const field of Object.keys(changes)) {
          if (['telf1', 'fax', 'no_telf_pic'].includes(field)) {
            setValue(field, `+${stg.code_prefix}-${stg.fax.padEnd(16, ' ')}`, { shouldDirty: true });
          } else if (['postal', 'postal_npwp', 'postal_sppkp'].includes(field)) {
            setValue(field, stg.postal_npwp.padEnd(5, ' '), { shouldDirty: true });
          } else {
            setValue(field, stg[field], { shouldDirty: true });
          }
        }
        setId(data.ticket.ven_id);
        setPhoneNumber('+' + data.vendor.detail.code_prefix + '-################');
        const { data: dataVendor } = await axiosPrivate.get(
          `/master/filetype?title=${data.vendor.detail.title}&localovs=${data.vendor.detail.local_ovs}&curpos=CREA`
        );
        dataVendor.forEach((item) => {
          if (data.vendor.is_tender && item.file_code == 'A010') {
            register(`files.${item.file_code}`, {
              required: item.file_type,
            });
          } else {
            register(
              `files.${item.file_code}`,
              item.is_mandatory && {
                required: item.file_type,
              }
            );
          }
        });
        const fileTypes = dataVendor.map((item) => {
          if (data.vendor.is_tender && item.file_code == 'A010') {
            return {
              key: item.file_code,
              value: `${t(item.file_type)} * `,
              help: item.help,
            };
          }
          return {
            key: item.file_code,
            value: `${t(item.file_type)} ${item.is_mandatory ? '*' : ''}`,
            help: item.help,
          };
        });
        setFileTypes(fileTypes);
        const getPayterm = async () => {
          try {
            const paytermData = await axiosPrivate.get(`/master/payterm`);
            const data = paytermData.data.data;
            const paytermOpt = data.map((item) => ({
              value: item.term_code,
              label: `${item.term_code}-${item.term_name}`,
            }));
            setPayterm(paytermOpt);
          } catch (error) {
            console.error(error);
            // alert(error.stack);
          }
        };
        getPayterm();
        const dynaCity = async () => {
          try {
            const getcities = await axiosPrivate.post(`/master/city`, {
              countryId: data.vendor.detail.country,
            });
            const result = getcities.data.data;
            const convcity = result.data.map((item) => ({
              value: item.city,
              label: item.city,
            }));
            setCities(convcity);
          } catch (err) {
            console.error(err);
            // alert(err.stack);
          }
        };
        dynaCity();
      } catch (error) {
        console.error(error);
        openSnackbar('error', error.response.data.message);
      }
    })();
  }, []);

  const submitFormEditRequest = async (is_draft) => {
    try {
      let action;
      setLoading(true);
      if (!ticketHeader.current.submitted) {
        action = 'submit';
      } else {
        action = 'approve';
      }
      setSubmit(true);
      const isValidated = await trigger();
      const changes = dirtyFields;
      if (!(Object.keys(changes).length > 0 || Object.keys(fileChanged).length > 0) && !is_draft) {
        openSnackbar('error', 'Cannot be submitted, no changes occured');
        return;
      }
      let vendor_data = MapperPayloadReqEdit(getValues());
      if (isValidated || is_draft) {
        let fd = new FormData();
        fd.append('data_vendor', JSON.stringify(vendor_data));
        fd.append('data_file', JSON.stringify(Object.values(fileChanged)));
        if (fileChanged) {
          Object.values(fileChanged).forEach((value, index) => {
            if (value.file) {
              fd.append(value.id, value.file);
            }
          });
        }
        fd.append('ven_id', ticketHeader.current.ven_id);
        fd.append('edited_field', JSON.stringify(changes));
        fd.append('version', ticketHeader.current.last_version);
        fd.append('ticket_id', searchParams.get('id'));
        fd.append('action', action);
        fd.append('is_draft', is_draft);

        const { data } = await axiosPrivate.post(`/ticeddet/process`, fd);
        if (is_draft) {
          setAlltoServer();
        } else {
          setHookTimeout(() => navigate(`/dashboard`), 2000);
        }
        openSnackbar('success', data.message);
        return;
      } else {
        openSnackbar('error', 'Error form validation');
        return;
      }
    } catch (error) {
      console.error(error);
      openSnackbar('error', error?.response?.data.message ?? error.message);
    } finally {
      setLoading(false);
      setSubmit(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
        <h3>Edit Detail Request</h3>
      </Box>
      <HeaderSection text="Company Detail" />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, p: 2, backgroundColor: theme.palette.common.white }}>
        <PatternFieldComp
          name="telf1"
          label={'Telephone Number'}
          useplaceholder
          control={control}
          format={phoneNumber}
          isNumString={false}
          sx={{ maxWidth: '20rem' }}
          dirty
        />
        <PatternFieldComp
          name="fax"
          label={'Handphone Number'}
          useplaceholder
          control={control}
          format={phoneNumber}
          isNumString={false}
          sx={{ maxWidth: '20rem' }}
          dirty
        />
        <TextFieldComp
          name="email"
          label="Email *"
          arrayDisabled={disabled}
          control={control}
          rules={{
            required: 'Please insert this field',
            pattern: {
              value: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g,
              message: 'invalid email address',
            },
          }}
          toLowerCase={true}
          sx={{ maxWidth: '30rem' }}
          dirty
        />
      </Box>
      <HeaderSection text="Informasi Website dan Media Sosial Vendor" />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, p: 2, backgroundColor: theme.palette.common.white }}>
        <TextFieldComp
          name="website_url"
          label={'URL Website'}
          control={control}
          rules={{ maxLength: { value: 500, message: 'Max 500 Character' } }}
          sx={{ maxWidth: '30rem' }}
          dirty
        />
        <TextFieldComp
          name="ig_link"
          label={'Instagram'}
          control={control}
          rules={{ maxLength: { value: 500, message: 'Max 500 Character' } }}
          sx={{ maxWidth: '30rem' }}
          dirty
        />
        <TextFieldComp
          name="fb_link"
          label={'Facebook'}
          control={control}
          rules={{ maxLength: { value: 500, message: 'Max 500 Character' } }}
          sx={{ maxWidth: '30rem' }}
          dirty
        />
        <TextFieldComp
          name="twt_link"
          label={'Twitter'}
          control={control}
          rules={{ maxLength: { value: 500, message: 'Max 500 Character' } }}
          sx={{ maxWidth: '30rem' }}
          dirty
        />
      </Box>
      <HeaderSection text="Organisasi Perusahaan" />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, p: 2, backgroundColor: theme.palette.common.white }}>
        <TextFieldComp
          name="nama_direktur"
          label={'Director Name' + ' *'}
          control={control}
          toUpperCase={true}
          rules={{
            required: 'Please insert this field',
            maxLength: { value: 300, message: 'Max 300 Character' },
          }}
          sx={{ maxWidth: '30rem' }}
          dirty
        />
        <TextFieldComp
          name="nama_pic"
          label={'PIC Name' + ' *'}
          control={control}
          toUpperCase={true}
          rules={{
            required: 'Please insert this field',
            maxLength: { value: 300, message: 'Max 300 Character' },
          }}
          tooltip={'Nama dari pihak vendor yang mengisi form'}
          sx={{ maxWidth: '30rem' }}
          dirty
        />
        <PatternFieldComp
          name="no_telf_pic"
          label={'Handphone Number PIC'}
          useplaceholder
          control={control}
          format={phoneNumber}
          isNumString={false}
          rules={{ required: 'Please insert this field' }}
          tooltip={
            'Nomor handphone pihak vendor yang berhubungan dengan KPN' +
            '. ' +
            'Gunakan format kode telfon internasional'
          }
          sx={{ maxWidth: '30rem' }}
          dirty
        />
        <TextFieldComp
          name="email_pic"
          label={'Email PIC' + ' *'}
          control={control}
          toLowerCase={true}
          rules={{
            required: 'Please insert this field',
            pattern: {
              value: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g,
              message: 'invalid email address',
            },
            maxLength: { value: 500, message: 'Max 500 Character' },
          }}
          tooltip={'Alamat email pihak vendor yang berhubungan dengan KPN'}
          sx={{ maxWidth: '30rem' }}
          dirty
        />
        <TextFieldComp
          name="email_fin"
          label={'Email Finance' + ' *'}
          control={control}
          toLowerCase={true}
          rules={{
            required: 'Please insert this field',
            pattern: {
              value: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g,
              message: 'invalid email address',
            },
            maxLength: { value: 500, message: 'Max 500 Character' },
          }}
          tooltip={'Email finance dari pihak vendor'}
          sx={{ maxWidth: '30rem' }}
          dirty
        />
      </Box>
      <HeaderSection text="Alamat Perusahaan" />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, p: 2, backgroundColor: theme.palette.common.white }}>
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            borderStyle: 'solid',
            bordermaxWidth: '1px',
            borderColor: theme.palette.grey[400],
            borderRadius: '20px',
            padding: 3,
            maxWidth: '50rem',
          }}
        >
          <p
            style={{
              position: 'absolute',
              top: '-13px',
              padding: '0 10px 0 10px',
              margin: '0',
              backgroundColor: 'white',
              color: theme.palette.grey[600],
            }}
          >
            {t('Alamat') + ' *'}
          </p>
          <p style={{ fontSize: '8pt', margin: '0', color: theme.palette.grey[600] }}>
            {`Max 50 ${t('Karakter')} ${t(`Please fill without ',' (comma) character`)} ${t(
              `Mohon dilanjutkan ke kolom berikutnya jika tidak cukup`
            )}`}
          </p>
          <TextFieldComp
            name="street"
            t={t}
            control={control}
            maxLength={35}
            rules={{
              required: 'Please insert this field',
              maxLength: { value: 35, message: 'Max 35 Character, continue to field below if not enough' },
              pattern: { value: /^[^,]*$/, message: t(`Please fill without ',' (comma) character`) },
            }}
            toUpperCase={true}
            dirty
          />
          <TextFieldComp
            name="street2"
            t={t}
            control={control}
            rules={{
              maxLength: { value: 35, message: 'Max 35 Character, continue to field below if not enough' },
              pattern: { value: /^[^,]*$/, message: `Please fill without ',' (comma) character` },
            }}
            toUpperCase={true}
            dirty
          />
          <TextFieldComp
            name="street3"
            t={t}
            control={control}
            rules={{
              maxLength: { value: 35, message: 'Max 35 Character, continue to field below if not enough' },
              pattern: { value: /^[^,]*$/, message: `Please fill without ',' (comma) character` },
            }}
            toUpperCase={true}
            dirty
          />
          <TextFieldComp
            name="street4"
            t={t}
            control={control}
            rules={{
              maxLength: { value: 35, message: 'Max 35 Character' },
              pattern: { value: /^[^,]*$/, message: `Please fill without ',' (comma) character` },
            }}
            toUpperCase={true}
            dirty
          />
        </Box>
        <AutoCompleteSelect
          name="city"
          label={t('City') + ' *'}
          t={t}
          control={control}
          options={cities}
          rules={{
            required: 'Please insert this field',
          }}
          freeSolo={true}
          sx={{ maxWidth: '30rem' }}
          dirty
        />
        <PatternFieldComp
          name="postal"
          label={t('Postal Code') + ' *'}
          t={t}
          control={control}
          rules={{
            required: t('Please insert this field'),
          }}
          format="#####"
          isNumString={false}
          dirty
        />
      </Box>
      <HeaderSection text="Alamat SPPKP" />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, p: 2, backgroundColor: theme.palette.common.white }}>
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            borderStyle: 'solid',
            bordermaxWidth: '1px',
            borderColor: theme.palette.grey[400],
            borderRadius: '20px',
            padding: 3,
            maxWidth: '50rem',
          }}
        >
          <p
            style={{
              position: 'absolute',
              top: '-13px',
              padding: '0 10px 0 10px',
              margin: '0',
              backgroundColor: 'white',
              color: theme.palette.grey[600],
            }}
          >
            {t('Alamat') + ' *'}
          </p>
          <p style={{ fontSize: '8pt', margin: '0', color: theme.palette.grey[600] }}>
            {`Max 50 ${t('Karakter')} ${t(`Please fill without ',' (comma) character`)} ${t(
              `Mohon dilanjutkan ke kolom berikutnya jika tidak cukup`
            )}`}
          </p>
          <TextFieldComp
            name="street_sppkp"
            t={t}
            control={control}
            maxLength={35}
            rules={{
              required: 'Please insert this field',
              maxLength: { value: 35, message: 'Max 35 Character, continue to field below if not enough' },
              pattern: { value: /^[^,]*$/, message: t(`Please fill without ',' (comma) character`) },
            }}
            toUpperCase={true}
            dirty
          />
          <TextFieldComp
            name="street2_sppkp"
            t={t}
            control={control}
            rules={{
              maxLength: { value: 35, message: 'Max 35 Character, continue to field below if not enough' },
              pattern: { value: /^[^,]*$/, message: `Please fill without ',' (comma) character` },
            }}
            toUpperCase={true}
            dirty
          />
          <TextFieldComp
            name="street3_sppkp"
            t={t}
            control={control}
            rules={{
              maxLength: { value: 35, message: 'Max 35 Character, continue to field below if not enough' },
              pattern: { value: /^[^,]*$/, message: `Please fill without ',' (comma) character` },
            }}
            toUpperCase={true}
            dirty
          />
          <TextFieldComp
            name="street4_sppkp"
            t={t}
            control={control}
            rules={{
              maxLength: { value: 35, message: 'Max 35 Character' },
              pattern: { value: /^[^,]*$/, message: `Please fill without ',' (comma) character` },
            }}
            toUpperCase={true}
            dirty
          />
        </Box>
        <AutoCompleteSelect
          name="city_sppkp"
          label={t('City') + ' *'}
          t={t}
          control={control}
          options={cities}
          rules={{
            required: 'Please insert this field',
          }}
          freeSolo={true}
          sx={{ maxWidth: '30rem' }}
          dirty
        />
        <PatternFieldComp
          name="postal_sppkp"
          label={t('Postal Code') + ' *'}
          t={t}
          control={control}
          rules={{
            required: t('Please insert this field'),
          }}
          format="#####"
          isNumString={false}
          dirty
        />
      </Box>
      <HeaderSection text="Alamat NPWP" />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, p: 2, backgroundColor: theme.palette.common.white }}>
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            borderStyle: 'solid',
            bordermaxWidth: '1px',
            borderColor: theme.palette.grey[400],
            borderRadius: '20px',
            padding: 3,
            maxWidth: '50rem',
          }}
        >
          <p
            style={{
              position: 'absolute',
              top: '-13px',
              padding: '0 10px 0 10px',
              margin: '0',
              backgroundColor: 'white',
              color: theme.palette.grey[600],
            }}
          >
            {t('Alamat') + ' *'}
          </p>
          <p style={{ fontSize: '8pt', margin: '0', color: theme.palette.grey[600] }}>
            {`Max 50 ${t('Karakter')} ${t(`Please fill without ',' (comma) character`)} ${t(
              `Mohon dilanjutkan ke kolom berikutnya jika tidak cukup`
            )}`}
          </p>
          <TextFieldComp
            name="street_npwp"
            t={t}
            control={control}
            maxLength={35}
            rules={{
              required: 'Please insert this field',
              maxLength: { value: 35, message: 'Max 35 Character, continue to field below if not enough' },
              pattern: { value: /^[^,]*$/, message: t(`Please fill without ',' (comma) character`) },
            }}
            toUpperCase={true}
            dirty
          />
          <TextFieldComp
            name="street2_npwp"
            t={t}
            control={control}
            rules={{
              maxLength: { value: 35, message: 'Max 35 Character, continue to field below if not enough' },
              pattern: { value: /^[^,]*$/, message: `Please fill without ',' (comma) character` },
            }}
            toUpperCase={true}
            dirty
          />
          <TextFieldComp
            name="street3_npwp"
            t={t}
            control={control}
            rules={{
              maxLength: { value: 35, message: 'Max 35 Character, continue to field below if not enough' },
              pattern: { value: /^[^,]*$/, message: `Please fill without ',' (comma) character` },
            }}
            toUpperCase={true}
            dirty
          />
          <TextFieldComp
            name="street4_npwp"
            t={t}
            control={control}
            rules={{
              maxLength: { value: 35, message: 'Max 35 Character' },
              pattern: { value: /^[^,]*$/, message: `Please fill without ',' (comma) character` },
            }}
            toUpperCase={true}
            dirty
          />
        </Box>
        <AutoCompleteSelect
          name="city_npwp"
          label={t('City') + ' *'}
          t={t}
          control={control}
          options={cities}
          rules={{
            required: 'Please insert this field',
          }}
          freeSolo={true}
          sx={{ maxWidth: '30rem' }}
          dirty
        />
        <PatternFieldComp
          name="postal_npwp"
          label={t('Postal Code') + ' *'}
          t={t}
          control={control}
          rules={{
            required: t('Please insert this field'),
          }}
          format="#####"
          isNumString={false}
          dirty
        />
      </Box>
      <HeaderSection text="Pajak dan Pembayaran" />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, p: 2, backgroundColor: theme.palette.common.white }}>
        <SelectComp
          name="pay_mthd"
          t={t}
          label={t('Payment Method') + ' *'}
          control={control}
          options={[
            { value: 'bank', label: 'Bank' },
            { value: 'cash', label: 'Cash' },
            { value: 'Giro', label: 'Giro' },
          ]}
          rules={{
            required: 'Please insert this field',
          }}
          sx={{ maxWidth: '20rem' }}
          dirty
        />
        <SelectComp
          name="pay_term"
          t={t}
          label={t('Payment Term') + ' *'}
          control={control}
          options={payterm}
          rules={{
            required: 'Please insert this field',
          }}
          tooltip={t('Jangka waktu pembayaran')}
          sx={{ maxWidth: '30rem' }}
          dirty
        />
      </Box>
      <HeaderSection text="Unggah File" />
      <VenFileTablev2
        id_vendor={id}
        getValues={getValues}
        setValue={setValue}
        errors={errors?.files}
        initFiles={initFiles}
      />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 4, mt: 1, gap: 2 }}>
        <LoadingButton
          variant="contained"
          color="warning"
          onClick={async (e) => {
            await submitFormEditRequest(true);
          }}
        >
          Save Draft
        </LoadingButton>
        <LoadingButton
          variant="contained"
          onClick={async (e) => {
            await submitFormEditRequest(false);
          }}
        >
          Submit
        </LoadingButton>
      </Box>
      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={isLoading}>
        <CircularProgress color="inherit" disableShrink />
      </Backdrop>
    </Box>
  );
}
