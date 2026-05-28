import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Backdrop,
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  Typography,
  useTheme,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckBoxOutlinedIcon from "@mui/icons-material/CheckBoxOutlined";
import CheckBoxOutlineBlankOutlinedIcon from "@mui/icons-material/CheckBoxOutlineBlankOutlined";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";

function ReadField({ label, value, xs = 4 }) {
  return (
    <Grid item xs={xs}>
      <Box
        sx={{
          position: "relative",
          border: "1px solid",
          borderColor: "rgba(0,0,0,0.23)",
          borderRadius: 1,
          px: 1.75,
          pt: 2,
          pb: 1,
          bgcolor: "action.disabledBackground",
          minHeight: 56,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            position: "absolute",
            top: -9,
            left: 10,
            px: 0.5,
            bgcolor: "background.paper",
            color: "text.secondary",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </Typography>
        <Typography variant="body1" color={value ? "text.primary" : "text.disabled"}>
          {value || ""}
        </Typography>
      </Box>
    </Grid>
  );
}

function ReadCheckbox({ label, value }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
      {value ? (
        <CheckBoxOutlinedIcon color="primary" />
      ) : (
        <CheckBoxOutlineBlankOutlinedIcon sx={{ color: "text.disabled" }} />
      )}
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

function AddressGroupBox({ label, lines = [] }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: "relative",
        display: "flex",
        flexWrap: "wrap",
        gap: 1,
        border: "1px solid",
        borderColor: theme.palette.grey[400],
        borderRadius: "20px",
        p: 3,
        mt: "8px",
        bgcolor: "action.disabledBackground",
      }}
    >
      <Typography
        variant="caption"
        sx={{
          position: "absolute",
          top: "-10px",
          left: "16px",
          px: 1,
          bgcolor: theme.palette.background.paper,
          color: theme.palette.grey[600],
        }}
      >
        {label}
      </Typography>

      {lines.map((line, i) => (
        <Box
          key={i}
          sx={{
            width: "100%",
            minHeight: "40px",
            px: 1,
            py: 1,
            borderRadius: 1,
            border: `1px solid ${theme.palette.grey[300]}`,
            bgcolor: "background.paper",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Typography variant="body2" color={line ? "text.primary" : "text.disabled"}>
            {line || "-"}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function DetailVendor({ t = s => s }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const axiosPrivate = useAxiosPrivate();
  const [loading, setLoading] = useState(false);
  const [vendor, setVendor] = useState(null);
  const [bankSapMap, setBankSapMap] = useState({});

  const [expanded, setExpanded] = useState({
    panelCompDet: true,
    panelInfoAcc: false,
    panelCompOrg: false,
    panelAddr: false,
    panelAddrnpwp: false,
    panelAddrsppkp: false,
    panelTax: false,
    panelVendetail: false,
    panelBank: false,
  });

  const toggle = panel => setExpanded(prev => ({ ...prev, [panel]: !prev[panel] }));

  useEffect(() => {
    const controller = new AbortController();

    const fetchVendor = async () => {
      setLoading(true);
      try {
        const res = await axiosPrivate.post(
          `/coupa/vendor/history/detail`,
          { code: id },
          { signal: controller.signal }
        );
        const data = res?.data?.data?.[0];
        if (data) setVendor(data);
      } catch (err) {
        if (err.name !== "CanceledError") console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchVendor();
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!vendor?.banks?.length) return;

    const controller = new AbortController();

    const fetchBankNames = async () => {
      try {
        // Collect unique country codes from the bank rows
        const countries = [...new Set(vendor.banks.map(b => b.country).filter(Boolean))];

        // Fetch bank list for each country in parallel
        const results = await Promise.all(
          countries.map(country =>
            axiosPrivate
              .get(`/master/banksap?country=${country}`, { signal: controller.signal })
              .then(res => res?.data?.data ?? [])
              .catch(() => [])
          )
        );

        // Build lookup map:  bank_id (string) → display label
        const map = {};
        results.flat().forEach(item => {
          if (item?.id != null) {
            const label = [item.bank_name, item.bank_code ? `(${item.bank_code})` : ""]
              .filter(Boolean)
              .join(" ");
            map[String(item.id)] = label;
          }
        });

        setBankSapMap(map);
      } catch (err) {
        if (err.name !== "CanceledError") console.error(err);
      }
    };

    fetchBankNames();
    return () => controller.abort();
  }, [vendor]);

  // Helpers
  const v = vendor ?? {};

  const npwpFormatted = v.is_new_npwp
    ? v.npwp
    : v.npwp
    ? String(v.npwp).replace(/^(\d{2})(\d{3})(\d{3})(\d{1})(\d{3})(\d{3})$/, "$1.$2.$3.$4-$5.$6")
    : "";

  const getBankLabel = bank_id => bankSapMap[String(bank_id)] ?? String(bank_id ?? "");
  return (
    <>
      <Container maxWidth="xl">
        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Button
              sx={{ height: 50, width: 100, margin: 2 }}
              color="error"
              variant="text"
              onClick={() => navigate("../coupa/history")}
            >
              {t("Back")}
            </Button>
          </Box>
        </Box>
        <Box
          sx={{
            height: 120,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Typography variant="h4" gutterBottom>
            {`Vendor Detail - ${v.coupa_id ?? id}`}
          </Typography>
        </Box>

        <Container>
          <Accordion
            expanded={expanded.panelCompDet}
            onChange={() => toggle("panelCompDet")}
            TransitionProps={{ unmountOnExit: true }}
          >
            <AccordionSummary
              sx={{ pointerEvents: "none" }}
              expandIcon={<ExpandMoreIcon sx={{ pointerEvents: "auto" }} />}
              id="panelCompDet"
            >
              <Typography>{t("Company Details")}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <ReadField label={t("Title") + " *"} value={v.title} xs={4} />
                <ReadField label={t("Local/Overseas") + " *"} value={v.local_ovs} xs={4} />
                <ReadField label={t("Country") + " *"} value={v.country} xs={4} />
                <ReadField label={t("Company Name") + " *"} value={v.name_1} xs={8} />
                <ReadField label={t("Telephone Number")} value={v.telf1} xs={4} />
                <ReadField label={t("Handphone Number")} value={v.fax} xs={4} />
                <ReadField label="Email *" value={v.email} xs={8} />
                <Grid item xs={3}>
                  <ReadCheckbox label="Kawasan Berikat" value={v.kawasan_berikat} />
                </Grid>
                <ReadField label={t("Search Term") + " *"} value={v.search_term} xs={5} />
                <ReadField label={t("ID COUPA") + " *"} value={v.coupa_id} xs={4} />
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Accordion
            expanded={expanded.panelInfoAcc}
            onChange={() => toggle("panelInfoAcc")}
            TransitionProps={{ unmountOnExit: true }}
          >
            <AccordionSummary
              sx={{ pointerEvents: "none" }}
              expandIcon={<ExpandMoreIcon sx={{ pointerEvents: "auto" }} />}
              id="panelInfoAcc"
            >
              <Typography>{t("Website and Social Media Vendor Information")}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <ReadField label={t("URL Website")} value={v.website_url} xs={6} />
                <ReadField label={t("Instagram")} value={v.ig_link} xs={6} />
                <ReadField label={t("Facebook")} value={v.fb_link} xs={6} />
                <ReadField label={t("Twitter")} value={v.twt_link} xs={6} />
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Accordion
            expanded={expanded.panelCompOrg}
            onChange={() => toggle("panelCompOrg")}
            TransitionProps={{ unmountOnExit: true }}
          >
            <AccordionSummary
              sx={{ pointerEvents: "none" }}
              expandIcon={<ExpandMoreIcon sx={{ pointerEvents: "auto" }} />}
              id="panelCompOrg"
            >
              <Typography>{t("Company Organization")}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <ReadField label={t("Director Name") + " *"} value={v.nama_direktur} xs={6} />
                <ReadField label={t("PIC Name") + " *"} value={v.nama_pic} xs={6} />
                <ReadField label={t("Handphone Number PIC")} value={v.no_telf_pic} xs={6} />
                <ReadField label={t("Email PIC") + " *"} value={v.email_pic} xs={6} />
                <ReadField label={t("Email Finance") + " *"} value={v.email_fin} xs={6} />
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Accordion
            expanded={expanded.panelAddr}
            onChange={() => toggle("panelAddr")}
            TransitionProps={{ unmountOnExit: true }}
          >
            <AccordionSummary
              sx={{ pointerEvents: "none" }}
              expandIcon={<ExpandMoreIcon sx={{ pointerEvents: "auto" }} />}
              id="panelAddr"
            >
              <div style={{ display: "flex", gap: 2 }}>
                <Typography>{t("Address Company")}</Typography>
              </div>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={9}>
                  <AddressGroupBox
                    label={t("Alamat") + " *"}
                    lines={[v.street, v.street2, v.street3, v.street4]}
                  />
                </Grid>
                <Grid item xs={3} />
                <ReadField label={t("City") + " *"} value={v.city} xs={5} />
                <ReadField label={t("Postal Code") + " *"} value={v.postal} xs={3} />
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Accordion
            expanded={expanded.panelAddrnpwp}
            onChange={() => toggle("panelAddrnpwp")}
            TransitionProps={{ unmountOnExit: true }}
          >
            <AccordionSummary
              sx={{ pointerEvents: "none" }}
              expandIcon={<ExpandMoreIcon sx={{ pointerEvents: "auto" }} />}
              id="panelAddrnpwp"
            >
              <div style={{ display: "flex", gap: "1rem" }}>
                <Typography>{t("Address NPWP")}</Typography>
              </div>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={9}>
                  <AddressGroupBox
                    label={t("Alamat") + " *"}
                    lines={[v.street_npwp, v.street2_npwp, v.street3_npwp, v.street4_npwp]}
                  />
                </Grid>
                <Grid item xs={3} />
                <ReadField label={t("City") + " *"} value={v.city_npwp} xs={5} />
                <ReadField label={t("Postal Code") + " *"} value={v.postal_npwp} xs={3} />
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Accordion
            expanded={expanded.panelAddrsppkp}
            onChange={() => toggle("panelAddrsppkp")}
            TransitionProps={{ unmountOnExit: true }}
          >
            <AccordionSummary
              sx={{ pointerEvents: "none" }}
              expandIcon={<ExpandMoreIcon sx={{ pointerEvents: "auto" }} />}
              id="panelAddrsppkp"
            >
              <div style={{ display: "flex", gap: "1rem" }}>
                <Typography>{t("Address SPPKP")}</Typography>
              </div>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={9}>
                  <AddressGroupBox
                    label={t("Alamat") + " *"}
                    lines={[v.street_sppkp, v.street2_sppkp, v.street3_sppkp, v.street4_sppkp]}
                  />
                </Grid>
                <Grid item xs={3} />
                <ReadField label={t("City")} value={v.city_sppkp} xs={5} />
                <ReadField label={t("Postal Code")} value={v.postal_sppkp} xs={3} />
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Accordion
            expanded={expanded.panelTax}
            onChange={() => toggle("panelTax")}
            TransitionProps={{ unmountOnExit: true }}
          >
            <AccordionSummary
              sx={{ pointerEvents: "none" }}
              expandIcon={<ExpandMoreIcon sx={{ pointerEvents: "auto" }} />}
            >
              <Typography>{t("Tax and Payment")}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <ReadCheckbox label="Pengusaha Kena Pajak (PKP)" value={v.is_pkp} />
                </Grid>
                <Grid item xs={12} />
                <Grid item xs={3}>
                  <Box
                    sx={{
                      border: "1px solid",
                      borderColor: "rgba(0,0,0,0.23)",
                      borderRadius: 1,
                      px: 1.75,
                      py: 1.25,
                      bgcolor: "action.disabledBackground",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={v.is_new_npwp ? 700 : 400}
                      color={v.is_new_npwp ? "primary" : "text.disabled"}
                    >
                      16 Digit
                    </Typography>
                    <Typography variant="body2" color="text.disabled">
                      /
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={!v.is_new_npwp ? 700 : 400}
                      color={!v.is_new_npwp ? "primary" : "text.disabled"}
                    >
                      Old
                    </Typography>
                  </Box>
                </Grid>
                <ReadField
                  label={t("Tax Number") + (v.local_ovs === "LOCAL" ? " *" : "")}
                  value={npwpFormatted}
                  xs={5}
                />
                <Grid item xs={4} />
                <ReadField label={t("Payment Method") + " *"} value={v.pay_mthd} xs={4} />
                <ReadField label={t("Payment Term") + " *"} value={v.pay_term} xs={4} />
                <ReadField label={t("VAT Type") + " *"} value={v.ppn_type} xs={4} />
                <ReadField label={t("NITKU") + " *"} value={v.nitku} xs={4} />
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Accordion
            expanded={expanded.panelVendetail}
            onChange={() => toggle("panelVendetail")}
            TransitionProps={{ unmountOnExit: true }}
          >
            <AccordionSummary
              sx={{ pointerEvents: "none" }}
              expandIcon={<ExpandMoreIcon sx={{ pointerEvents: "auto" }} />}
            >
              <Typography>{t("Vendor Details")}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <ReadField label={t("Company") + " *"} value={v.company} xs={4} />
                <ReadField label="Purchasing Organization *" value={v.purch_org} xs={4} />
                <Grid item xs={3} />
                <ReadField label="Vendor Group *" value={v.ven_group} xs={4} />
                <ReadField label="Vendor Account *" value={v.ven_acc} xs={4} />
                <ReadField label="Vendor Type *" value={v.ven_type} xs={4} />
                <ReadField label={t("Limit Currency")} value={v.lim_curr} xs={4} />
                <ReadField
                  label={t("Limit")}
                  value={v.limit_vendor != null ? String(v.limit_vendor) : ""}
                  xs={4}
                />
                <Grid item xs={4} />
                <Grid item xs={5}>
                  <ReadCheckbox label={t("Vendor Tender Participant")} value={v.is_tender} />
                  <ReadCheckbox label={t("Vendor Priority")} value={v.is_priority} />
                  <ReadCheckbox label={t("Interest Payment Priority")} value={v.is_interest} />
                </Grid>
                <ReadField label="Description *" value={v.description} xs={12} />
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Accordion
            expanded={expanded.panelBank}
            onChange={() => toggle("panelBank")}
            TransitionProps={{ unmountOnExit: true }}
          >
            <AccordionSummary
              sx={{ pointerEvents: "none" }}
              expandIcon={<ExpandMoreIcon sx={{ pointerEvents: "auto" }} />}
            >
              <Typography>{t("Bank Information")}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {v.banks?.length > 0 ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {v.banks.map((bank, index) => (
                    <Box
                      key={bank.id ?? index}
                      sx={{
                        position: "relative",
                        borderStyle: "solid",
                        borderWidth: "1px",
                        borderColor: theme.palette.grey[400],
                        borderRadius: "20px",
                        padding: 3,
                        mt: "8px",
                      }}
                    >
                      <p
                        style={{
                          position: "absolute",
                          top: "-13px",
                          padding: "0 10px",
                          margin: 0,
                          backgroundColor: theme.palette.background.paper,
                          color: theme.palette.grey[600],
                          fontSize: "0.75rem",
                        }}
                      >
                        {t("Bank")} #{index + 1}
                      </p>
                      <Grid container spacing={2}>
                        <ReadField label={t("Bank")} value={getBankLabel(bank.bank_id)} xs={4} />
                        <ReadField label={t("Account Number")} value={bank.bank_acc} xs={3} />
                        <ReadField label={t("Account Holder")} value={bank.acc_hold} xs={3} />
                        <ReadField label={t("Currency")} value={bank.bank_curr} xs={2} />
                        <ReadField label={t("Country")} value={bank.country} xs={1} />
                      </Grid>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.disabled">
                  {t("No bank information available.")}
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        </Container>

        <Backdrop sx={{ color: "#fff", zIndex: theme => theme.zIndex.drawer + 1 }} open={loading}>
          <CircularProgress color="inherit" disableShrink />
        </Backdrop>
      </Container>
    </>
  );
}

export default DetailVendor;
