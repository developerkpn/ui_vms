import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography,
  Tooltip,
  MenuItem,
} from "@mui/material";
import {
  CloudUpload,
  Delete,
  InfoOutlined,
  Save,
} from "@mui/icons-material";

const SingleMaterialForm = ({onBack}) => {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 0,
        border: "1px solid",
        borderColor: "divider",
        maxWidth: 1000,
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
          Form Material
        </Typography>
      </Box>

      <CardContent sx={{ p: 4 }}>
        <Grid container spacing={4}>
          {/* Basic Info Section */}
          <Grid item xs={12}>
            <Box
              sx={{
                display: "inline-block",
                px: 2,
                py: 0.5,
                bgcolor: "#4caf50",
                borderRadius: 5,
                mb: 3,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 800, color: "white" }}
              >
                Basic Info
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block" }}>
                  Material Group <span style={{ color: "red" }}>*</span>
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  select
                  defaultValue=""
                  SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value="" disabled>Choose</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block" }}>
                  Sub Material Group <span style={{ color: "red" }}>*</span>
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  select
                  defaultValue=""
                  SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value="" disabled>Choose</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block" }}>
                  Material Description <span style={{ color: "red" }}>*</span>
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    inputProps={{ maxLength: 40 }}
                    sx={{
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderStyle: "dashed",
                      },
                    }}
                  />
                  <Tooltip
                    title={
                      <Box sx={{ p: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Notes</Typography>
                        <Typography variant="caption">
                          Field length ≤ 40 characters; only alphanumeric characters (A—Z, 0—9) are permitted; spaces, special characters, and emojis are not allowed.
                        </Typography>
                      </Box>
                    }
                    arrow
                    placement="right"
                  >
                    <IconButton size="small" sx={{ color: "#3f51b5" }}>
                      <InfoOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block" }}>
                  Base UoM <span style={{ color: "red" }}>*</span>
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  select
                  defaultValue=""
                  SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value="" disabled>Choose</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block" }}>
                  Long Text
                </Typography>
                <Stack spacing={1}>
                  {[1, 2, 3].map((i) => (
                    <TextField
                      key={i}
                      fullWidth
                      size="small"
                      inputProps={{ maxLength: 40 }}
                      sx={{
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderStyle: "dashed",
                        },
                      }}
                    />
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </Grid>

          {/* Specification Section */}
          <Grid item xs={12}>
            <Divider sx={{ mb: 4 }} />
            <Box
              sx={{
                display: "inline-block",
                px: 2,
                py: 0.5,
                bgcolor: "#4caf50",
                borderRadius: 5,
                mb: 3,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 800, color: "white" }}
              >
                Specification
              </Typography>
            </Box>

            <Grid container spacing={3}>
              {[
                { label: "Part Number", hasIcon: true },
                { label: "Type / Bentuk", hasIcon: true },
                { label: "Model", hasIcon: true },
                { label: "Bahan / Warna Material", hasIcon: true },
                { label: "Size / Dimension", hasIcon: true },
                { label: "Brand", hasIcon: true },
              ].map((field, idx) => (
                <Grid item xs={12} md={6} key={idx}>
                  <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block" }}>
                    {field.label}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <TextField
                      fullWidth
                      size="small"
                      sx={{
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderStyle: "dashed",
                        },
                      }}
                    />
                    {field.hasIcon && (
                      <IconButton size="small" sx={{ color: "#3f51b5" }}>
                        <InfoOutlined fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* Attachment Section */}
          <Grid item xs={12}>
            <Divider sx={{ mb: 4 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
              Attachment <span style={{ color: "red" }}>*</span>
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 2 }}
            >
              supported formats: PDF, DOC, DOCX, PNG, JPG, JPEG
            </Typography>

            <Box sx={{ display: "flex", gap: 2, mb: 4 }}>
              <Button
                variant="outlined"
                sx={{
                  textTransform: "none",
                  borderColor: "#1976d2",
                  color: "#1976d2",
                  px: 3,
                }}
              >
                Browsing File
              </Button>
              <Button
                variant="contained"
                disableElevation
                sx={{ textTransform: "none", bgcolor: "#1976d2", px: 4 }}
              >
                Upload
              </Button>
            </Box>

            <Stack spacing={1}>
              {[
                { name: "image1.jpg", size: "0.14MB" },
                { name: "image2.jpg", size: "0.14MB" },
                { name: "image3.jpg", size: "0.14MB" },
              ].map((file, i) => (
                <Box
                  key={i}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    maxWidth: 400,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box
                      sx={{
                        width: 50,
                        height: 50,
                        bgcolor: "#eeeeee",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "#757575" }}>
                        Image
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {file.name} <span style={{ color: "red" }}>*</span>
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {file.size}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton size="small" color="error">
                    <Delete />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          </Grid>
        </Grid>
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

export default SingleMaterialForm;
