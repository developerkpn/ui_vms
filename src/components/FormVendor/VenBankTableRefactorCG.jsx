import {
  IconButton,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Table,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import { useState, useCallback } from "react";
// import AutoCompleteCustom from '../common/AutoCompleteCustom';
import AutoCompleteBankController from "../common/AutoCompleteBankControllerCG";
import AutoCompleteCustomController from "../common/AutoCompleteCustomController ";
import UploadComponent from "../common/UploadComponent";
import { TextFieldComp } from "../common/TextFieldComp";

function VenBankTableRow({
  field,
  index,
  control,
  currencies,
  watch,
  getValues,
  remove,
  setStat,
  is_allow,
  t,
  ven_id,
  clearField,
  setValue,
}) {
  const axiosPrivate = useAxiosPrivate();
  const [isDeleting, setDeleting] = useState(false);
  const handleDeleteData = useCallback(
    async (index, newidbank) => {
      const source = getValues(`bank.${index}.source`);
      const id = getValues(`bank.${index}.id`);

      if (confirm(`Are you sure want to delete ${getValues(`bank.${index}.bank_acc`)} ?`)) {
        setDeleting(true);
        try {
          const { data } = await axiosPrivate.post(`/vendor/deletebank`, {
            id: id,
          });
          const { data: deleteFiles } = await axiosPrivate.delete(`/vendor/clearfilebank`, {
            data: { bank_id: id },
          });
          setStat({
            stat: true,
            type: "success",
            message: data.message,
          });
          remove(index);
        } catch (error) {
          console.error(error);
          setStat({
            stat: true,
            type: "error",
            message: error.response?.data?.message ?? error.message,
          });
        } finally {
          setDeleting(false);
        }
      }
    },
    [index]
  );

  return (
    <TableRow key={field.id}>
      <TableCell>
        <AutoCompleteBankController
          control={control}
          name={`bank.${index}.bank_id`}
          getValues={getValues}
          setValue={setValue}
          index={index}
          watch={watch}
          rules={{ required: "Please insert this field" }}
          t={t}
          readOnly={!is_allow}
          tooltip={getValues(`bank.${index}.bank_id`)?.label}
        />
      </TableCell>
      <TableCell>
        <AutoCompleteCustomController
          control={control}
          name={`bank.${index}.bank_curr`}
          options={currencies}
          rules={{ required: "Please insert this field" }}
          t={t}
          disabled={!is_allow}
        />
      </TableCell>
      <TableCell>
        <TextFieldComp
          control={control}
          name={`bank.${index}.bank_acc`}
          rules={{ required: "Please insert this field" }}
          Number
          t={t}
          disabled={!is_allow}
        />
      </TableCell>
      <TableCell>
        <TextFieldComp
          control={control}
          name={`bank.${index}.acc_hold`}
          rules={{ required: "Please insert this field" }}
          toUpperCase
          t={t}
          disabled={!is_allow}
        />
      </TableCell>
      <TableCell>
        {watch("ventype") != "OVERSEAS" ? (
          <UploadComponent
            control={control}
            tooltip={"Surat yang dikeluarkan vendor beserta tanda tangan direktur perusahaan"}
            name={`bank.${index}.account_statement_letter`}
            rules={{ required: "Please insert this field" }}
            fileType="A001"
            id={getValues(`bank.${index}.id`)}
            ven_id={ven_id}
            t={t}
            disabled={!is_allow}
            clearField={clearField}
            setValue={setValue}
            is_allow={is_allow}
          />
        ) : (
          <UploadComponent
            control={control}
            name={`bank.${index}.form_dgt`}
            rules={{ required: "Please insert this field" }}
            fileType="A012"
            id={getValues(`bank.${index}.id`)}
            ven_id={ven_id}
            t={t}
            disabled={!is_allow}
            clearField={clearField}
            setValue={setValue}
            is_allow={is_allow}
          />
        )}
      </TableCell>
      <TableCell>
        <UploadComponent
          control={control}
          tooltip={"Halaman pertama buku rekening tertampil nomor rekening bank"}
          name={`bank.${index}.passbook`}
          rules={{ required: "Please insert this field" }}
          fileType="A002"
          id={getValues(`bank.${index}.id`)}
          ven_id={ven_id}
          t={t}
          disabled={!is_allow}
          clearField={clearField}
          setValue={setValue}
          is_allow={is_allow}
        />
      </TableCell>
      {is_allow && (
        <TableCell>
          <IconButton
            variant="contained"
            color="error"
            disabled={isDeleting}
            onClick={e => {
              handleDeleteData(index, field.id);
            }}
          >
            {isDeleting ? <CircularProgress /> : <Delete />}
          </IconButton>
        </TableCell>
      )}
    </TableRow>
  );
}

export default function VenBankTableRefactor({
  control,
  fields,
  append,
  remove,
  getValues,
  t,
  currencies,
  watch,
  is_allow,
  ven_id,
  clearField,
  setValue,
  ...props
}) {
  const [formStat, setFormStat] = useState({
    stat: false,
    type: "success",
    message: "",
  });

  const handleSnackClose = useCallback(() => {
    setFormStat({
      stat: false,
      type: "success",
      message: "",
    });
  }, []);

  const updateFormStat = useCallback(value => {
    setFormStat(value);
  }, []);
  return (
    <>
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
      <TableContainer sx={{ width: "100%" }}>
        <Table sx={{ width: "100rem" }}>
          <TableHead>
            <TableRow>
              <TableCell>{t("Bank Name")}</TableCell>
              <TableCell sx={{ width: "10%" }}>{t("Currency")}</TableCell>
              <TableCell sx={{ width: "15%" }}>{t("Bank Account")}</TableCell>
              <TableCell sx={{ width: "18%" }}>{t("Account Holder")}</TableCell>
              <TableCell sx={{ width: "5%" }}>
                {watch("ventype") != "OVERSEAS" ? t("Account Statement Letter") : t("Form DGT")}
              </TableCell>
              <TableCell sx={{ width: "5%" }}>{t("Passbook")}</TableCell>
              <TableCell sx={{ width: "2%" }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {fields.map(
              (field, index) => {
                return (
                  <VenBankTableRow
                    key={"row-" + index}
                    field={field}
                    index={index}
                    control={control}
                    currencies={currencies}
                    watch={watch}
                    getValues={getValues}
                    setStat={updateFormStat}
                    remove={remove}
                    is_allow={is_allow}
                    t={t}
                    clearField={clearField}
                    ven_id={ven_id}
                    setValue={setValue}
                  />
                );
              }

              // {
              //   return (
              //     <TableRow key={field.id}>
              //       <TableCell>
              //         <AutoCompleteCustomController
              //           control={control}
              //           name={`bank.${index}.bank_country`}
              //           option_type="value"
              //           options={countries}
              //           is_local={is_local}
              //         />
              //       </TableCell>
              //       <TableCell>
              //         <AutoCompleteBankController
              //           control={control}
              //           name={`bank.${index}.bank_id`}
              //           getValues={getValues}
              //           index={index}
              //           watch={watch}
              //         />
              //       </TableCell>
              //       <TableCell>
              //         <AutoCompleteCustomController
              //           control={control}
              //           name={`bank.${index}.bank_curr`}
              //           options={currencies}
              //         />
              //       </TableCell>
              //       <TableCell>
              //         <TextFieldComp control={control} name={`bank.${index}.bank_acc`} />
              //       </TableCell>
              //       <TableCell>
              //         <TextFieldComp control={control} name={`bank.${index}.acc_hold`} />
              //       </TableCell>
              //       <TableCell>
              //         <IconButton variant="contained" color="error">
              //           <Delete />
              //         </IconButton>
              //       </TableCell>
              //     </TableRow>
              //   );
              // }
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
