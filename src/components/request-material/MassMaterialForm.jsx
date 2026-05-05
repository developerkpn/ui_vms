import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Tooltip,
  Paper,
} from "@mui/material";
import {
  CloudUpload,
  Delete,
  AttachFile,
  FileUpload,
} from "@mui/icons-material";

const MassMaterialForm = ({ onBack }) => {
  const [rows, setRows] = useState(
    Array(8).fill({
      plant: "",
      sloc: "",
      description: "",
      uom: "",
      brand: "",
      partNo: "",
      size: "",
      bahan: "",
      attach: null,
    })
  );

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 0,
        border: "1px solid",
        borderColor: "divider",
        width: "100%",
        mx: "auto",
        mb: 4,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#455a64" }}>
          Form Mass Material
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<AttachFile />}
            sx={{
              bgcolor: "#1a237e",
              textTransform: "none",
              borderRadius: 1,
              "&:hover": { bgcolor: "#0d47a1" },
            }}
          >
            Upload Attachment
          </Button>
          <Button
            variant="contained"
            startIcon={<FileUpload />}
            sx={{
              bgcolor: "#1a237e",
              textTransform: "none",
              borderRadius: 1,
              "&:hover": { bgcolor: "#0d47a1" },
            }}
          >
            Upload Excel
          </Button>
        </Box>
      </Box>

      <CardContent sx={{ p: 2 }}>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.secondary" }}>
            Mass Upload Preview
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
            *Upload Max 10 Material
          </Typography>
        </Box>

        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 0 }}>
          <Table size="small" sx={{ borderCollapse: "collapse" }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f5f7f9" }}>
                <TableCell align="center" sx={{ fontWeight: 700, border: "1px solid #e0e0e0", py: 1.5 }}>Plant</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, border: "1px solid #e0e0e0", py: 1.5 }}>Sloc</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, border: "1px solid #e0e0e0", py: 1.5 }}>Description</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, border: "1px solid #e0e0e0", py: 1.5 }}>UoM</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, border: "1px solid #e0e0e0", py: 1.5 }}>Brand</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, border: "1px solid #e0e0e0", py: 1.5 }}>Part No</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, border: "1px solid #e0e0e0", py: 1.5 }}>Size</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, border: "1px solid #e0e0e0", py: 1.5 }}>Bahan</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, border: "1px solid #e0e0e0", py: 1.5, width: 60 }}>Attach</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={index}>
                  <TableCell sx={{ border: "1px solid #e0e0e0", height: 42 }}></TableCell>
                  <TableCell sx={{ border: "1px solid #e0e0e0" }}></TableCell>
                  <TableCell sx={{ border: "1px solid #e0e0e0" }}></TableCell>
                  <TableCell sx={{ border: "1px solid #e0e0e0" }}></TableCell>
                  <TableCell sx={{ border: "1px solid #e0e0e0" }}></TableCell>
                  <TableCell sx={{ border: "1px solid #e0e0e0" }}></TableCell>
                  <TableCell sx={{ border: "1px solid #e0e0e0" }}></TableCell>
                  <TableCell sx={{ border: "1px solid #e0e0e0" }}></TableCell>
                  <TableCell align="center" sx={{ border: "1px solid #e0e0e0", p: 0.5 }}>
                    <IconButton size="small" sx={{ color: "#757575" }}>
                      <FileUpload fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>

      {/* Footer */}
      <Box
        sx={{
          p: 2.5,
          borderTop: "1px solid",
          borderColor: "divider",
          display: "flex",
          justifyContent: "flex-end",
          gap: 2,
        }}
      >
        <Button
          variant="contained"
          sx={{
            bgcolor: "#546e7a",
            "&:hover": { bgcolor: "#455a64" },
            textTransform: "none",
            minWidth: 100,
          }}
          onClick={onBack}
        >
          Close
        </Button>
        <Button
          variant="contained"
          disableElevation
          sx={{
            bgcolor: "#1976d2",
            textTransform: "none",
            minWidth: 100,
          }}
        >
          Save
        </Button>
      </Box>
    </Card>
  );
};

export default MassMaterialForm;
