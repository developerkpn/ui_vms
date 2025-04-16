import { Card, CardContent, Paper, Box, Typography } from "@mui/material";
import { useRef, useEffect } from "react";
import palette from "src/theme/palette";

export default function CardDataVendor({ index, style, dataven, setRowsHeights }) {
  const cardRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) {
      setRowsHeights(index, cardRef.current.clientHeight);
    }
  }, [cardRef]);

  return (
    <div style={{ ...style }}>
      <Card ref={cardRef} sx={{ width: "98%", px: 3, py: 1, height: "fit-content" }}>
        <CardContent>
          <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Box sx={{ display: "flex", gap: 2 }}>
                <h4>{dataven.Vendor_Name}</h4>
                <p>{`(${dataven.Vendor_Code})`}</p>
              </Box>
              <Paper
                sx={theme => ({
                  backgroundColor:
                    dataven.Active == "Y" ? theme.palette.success.main : theme.palette.error.main,
                  height: "fit-content",
                  p: 1,
                })}
              >
                <Typography
                  sx={theme => ({
                    color:
                      dataven.Active == "Y"
                        ? theme.palette.success.contrastText
                        : theme.palette.error.contrastText,
                  })}
                >
                  {dataven.Active == "Y" ? "Active" : "Inactive"}
                </Typography>
              </Paper>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <h4>{dataven.Vendor_Type}</h4>
              <p>{`(${dataven.Vendor_TypeCode})`}</p>
            </Box>
            <Box sx={{ display: "flex" }}>
              <table className="card-vendor" style={{ width: "100%", display: "inline-block" }}>
                <tr>
                  <td>
                    <p>NPWP</p>
                  </td>
                  <td>
                    <p>:</p>
                  </td>
                  <td style={{ width: "70%" }}>
                    <p>{dataven.NPWP}</p>
                  </td>
                </tr>
                <tr style={{ height: "fit-content" }}>
                  <td>
                    <p>Alamat</p>
                  </td>
                  <td>
                    <p>:</p>
                  </td>
                  <td style={{ width: "70%" }}>
                    <p>{dataven.address}</p>
                  </td>
                </tr>
                <tr style={{ height: "fit-content" }}>
                  <td>
                    <p>Status</p>
                  </td>
                  <td>
                    <p>:</p>
                  </td>
                  <td style={{ width: "70%" }}>
                    <p>{dataven.Status}</p>
                  </td>
                </tr>
              </table>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </div>
  );
}
