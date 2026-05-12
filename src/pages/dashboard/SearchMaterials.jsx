import {
  Close,
  Download,
  Edit,
  Visibility,
  MoreHoriz,
  InsertDriveFile,
  Image as ImageIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Pagination,
  Select,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { createColumnHelper } from "@tanstack/react-table";
import moment from "moment";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SearchSuggestionField from "src/components/common/SearchSuggestionField";
import TableSorting from "src/components/table/TableSorting";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import attachmentPlaceholder from "src/images/material-attachment-placeholder.svg";
import usePermissionStore from "src/store/userPermissionStore";

const columnHelper = createColumnHelper();
const MAX_ATTACHMENT_PREVIEW = 3;

const AuthenticatedImage = ({ src, sx, onClick }) => {
  const axiosPrivate = useAxiosPrivate();
  const [imgSrc, setImgSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchImage = async () => {
      try {
        const response = await axiosPrivate.get(src, { responseType: "blob" });
        if (isMounted) {
          const url = URL.createObjectURL(response.data);
          setImgSrc(url);
          setError(false);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(true);
          setImgSrc(null);
          setLoading(false);
        }
      }
    };

    fetchImage();
    return () => {
      isMounted = false;
      if (imgSrc) {
        URL.revokeObjectURL(imgSrc);
      }
    };
  }, [src, axiosPrivate]);

  if (loading) return <CircularProgress size={16} thickness={5} sx={{ color: "grey.300" }} />;

  return (
    <Box
      component="img"
      src={error ? attachmentPlaceholder : imgSrc}
      sx={{
        ...sx,
        transition: "transform 0.2s",
        "&:hover": { transform: "scale(1.1)" },
      }}
      onError={() => setError(true)}
      onClick={onClick}
    />
  );
};

export default function SearchMaterials() {
  const axiosPrivate = useAxiosPrivate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState("idle");
  const [materials, setMaterials] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 5,
    totalCount: 0,
    totalPages: 0,
  });
  const [sorting, setSorting] = useState([]);
  const [attachmentsDialogOpen, setAttachmentsDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [aliasDialogOpen, setAliasDialogOpen] = useState(false);
  const [aliases, setAliases] = useState({
    alias1: "",
    alias2: "",
    alias3: "",
  });
  const [aliasLoading, setAliasLoading] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuMaterial, setMenuMaterial] = useState(null);
  const permission = usePermissionStore(state => state.permission);

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await axiosPrivate.get("/material/groups/dropdown");
      setGroups(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch groups:", error);
    }
  };

  // Remove redundant useEffect that resets page 1 automatically
  // Handling reset in event handlers instead for better predictability

  useEffect(() => {
    fetchMaterials(pagination.page);
  }, [searchQuery, selectedGroup, pagination.page, sorting, searchMode]);

  const fetchMaterials = useCallback(
    async (pageNumber = 1) => {
      if (searchMode !== "selected") {
        setMaterials([]);
        setPagination(prev => ({
          ...prev,
          totalCount: 0,
          totalPages: 0,
          page: 1,
        }));
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await axiosPrivate.get("/material/search", {
          params: {
            q: searchQuery,
            groupId: selectedGroup,
            page: pageNumber,
            pageSize: pagination.pageSize,
            sortBy: sorting[0]?.id || "createdAt",
            sortOrder: sorting[0]?.desc ? "desc" : "asc",
          },
        });

        const data = response.data.data || [];
        const normalizedQuery = (searchQuery || "").toLowerCase().trim();
        const exactMatches = data.filter(item => {
          const code = (item.code || "").toLowerCase();
          const name = (item.name || "").toLowerCase();
          return code === normalizedQuery || name === normalizedQuery;
        });
        const singleRow = exactMatches.length > 0 ? [exactMatches[0]] : data.slice(0, 1);

        setMaterials(singleRow);
        setPagination(prev => ({
          ...prev,
          totalCount: singleRow.length,
          totalPages: singleRow.length ? 1 : 0,
          page: 1,
        }));
      } catch (error) {
        console.error("Failed to fetch materials:", error);
      } finally {
        setLoading(false);
      }
    },
    [searchMode, searchQuery, selectedGroup, pagination.pageSize, sorting, axiosPrivate]
  );

  const resetTableState = () => {
    setMaterials([]);
    setPagination(prev => ({
      ...prev,
      totalCount: 0,
      totalPages: 0,
      page: 1,
    }));
  };

  const handleSearchChange = payload => {
    if (!payload) return;

    if (payload.type === "select" || payload.type === "enter-top" || payload.type === "icon-top") {
      setSearchMode("selected");
      setSearchQuery(payload.keyword || "");
      setPagination(prev => ({ ...prev, page: 1 }));
      return;
    }

    if (payload.type === "not-found") {
      setSearchMode("no-match");
      setSearchQuery("");
      resetTableState();
      return;
    }
  };

  const handleSearchInputChange = value => {
    if (searchMode === "selected" || searchMode === "no-match") {
      setSearchMode("idle");
      setSearchQuery("");
      resetTableState();
    }

    if (!value) {
      setSearchMode("idle");
      setSearchQuery("");
      resetTableState();
    }
  };

  const handleGroupChange = e => {
    setSelectedGroup(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (event, value) => {
    setPagination(prev => ({ ...prev, page: value }));
    // fetchMaterials will be called by useEffect
  };

  const handleActionMenuOpen = (event, material) => {
    setAnchorEl(event.currentTarget);
    setMenuMaterial(material);
  };

  const handleActionMenuClose = () => {
    setAnchorEl(null);
    setMenuMaterial(null);
  };

  const handleOpenAttachmentsDialog = material => {
    setSelectedMaterial(material);
    setAttachmentsDialogOpen(true);
  };

  const handleCloseAttachmentsDialog = () => {
    setAttachmentsDialogOpen(false);
    setSelectedMaterial(null);
  };

  const handleOpenAliasDialog = material => {
    setSelectedMaterial(material);
    setAliases({
      alias1: material.alias1 || "",
      alias2: material.alias2 || "",
      alias3: material.alias3 || "",
    });
    setAliasDialogOpen(true);
  };

  const handleCloseAliasDialog = () => {
    setAliasDialogOpen(false);
    setSelectedMaterial(null);
  };

  const handleViewAttachment = attachment => {
    const fileUrl = `${import.meta.env.VITE_URL_LOC}/material/file/${attachment.attachment}`;
    setPreviewFile({
      url: fileUrl,
      name: attachment.attachment,
      type: attachment.type || attachment.fileType || "application/octet-stream",
    });
    setPreviewModalOpen(true);
  };

  const columns = useMemo(
    () => [
      columnHelper.display({
        header: "Action",
        id: "actions",
        cell: ({ row }) => (
          <IconButton onClick={e => handleActionMenuOpen(e, row.original)}>
            <MoreHoriz />
          </IconButton>
        ),
      }),
      columnHelper.accessor("code", {
        header: "Code",
        cell: info => (
          <Typography variant="body2" sx={{ color: "primary.main", fontWeight: 500 }}>
            {info.getValue()}
          </Typography>
        ),
      }),
      columnHelper.accessor("name", {
        header: "Material Description",
        size: 280,
        cell: info => (
          <Box sx={{ minWidth: 200 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
              {info.getValue()}
            </Typography>
            {info.row.original.spec && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.5 }}
              >
                {info.row.original.spec}
              </Typography>
            )}
          </Box>
        ),
      }),
      columnHelper.accessor("groupName", {
        header: "Group",
        size: 200,
        cell: info => (
          <Typography variant="body2" sx={{ minWidth: 150 }}>
            {info.row.original.groupCode} - {info.getValue()}
          </Typography>
        ),
      }),
      columnHelper.display({
        header: "Alias",
        id: "aliases",
        size: 180,
        cell: ({ row }) => {
          const aliases_list = [
            row.original.alias1,
            row.original.alias2,
            row.original.alias3,
          ].filter(Boolean);
          return (
            <Typography variant="body2" sx={{ minWidth: 120 }}>
              {aliases_list.join(", ") || "-"}
            </Typography>
          );
        },
      }),
      columnHelper.accessor("unit_of_measurement", {
        header: "UoM",
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: info => (
          <Typography
            variant="caption"
            sx={{
              px: 1,
              py: 0.5,
              borderRadius: 1,
              bgcolor: info.getValue() === "Active" ? "success.lighter" : "grey.200",
              color: info.getValue() === "Active" ? "success.main" : "text.secondary",
              fontWeight: 600,
            }}
          >
            {info.getValue()}
          </Typography>
        ),
      }),
      columnHelper.accessor("created_by", {
        header: "Created By",
        cell: ({ getValue }) => getValue() || "-",
      }),
      columnHelper.accessor("created_at", {
        header: "Created At",
        cell: info => moment(info.getValue()).format("YYYY-MM-DD"),
      }),
      columnHelper.display({
        header: "Attachment",
        id: "attachment",
        size: 160,
        cell: ({ row }) => {
          const attachments = row.original.attachments || [];
          const isImage = file => {
            if (!file) return false;
            const ext = file.split(".").pop().toLowerCase();
            return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
          };
          const previewItems =
            attachments.length > 0
              ? attachments.slice(0, MAX_ATTACHMENT_PREVIEW)
              : Array.from({ length: MAX_ATTACHMENT_PREVIEW }, (_, idx) => ({
                  attachment: `placeholder-${idx}`,
                  isPlaceholder: true,
                }));

          return (
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-start",
                alignItems: "center",
                gap: 0.75,
                minWidth: 140,
              }}
            >
              {previewItems.map((att, idx) => {
                const isPlaceholder = Boolean(att.isPlaceholder);
                const isImg = isImage(att.attachment);
                return (
                  <Tooltip
                    key={idx}
                    title={isPlaceholder ? "Attachment placeholder" : att.attachment}
                    arrow
                  >
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: 1,
                        border: "1px solid",
                        borderColor: "divider",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        backgroundColor: "white",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                        transition: "all 0.2s",
                        "&:hover": {
                          borderColor: "primary.main",
                          boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                          transform: "translateY(-2px)",
                        },
                        ...(isPlaceholder && {
                          cursor: "default",
                          "&:hover": {
                            borderColor: "divider",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                            transform: "none",
                          },
                        }),
                      }}
                      onClick={isPlaceholder ? undefined : () => handleViewAttachment(att)}
                    >
                      {isPlaceholder ? (
                        <Box
                          component="img"
                          src={attachmentPlaceholder}
                          alt="Attachment placeholder"
                          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : isImg ? (
                        <AuthenticatedImage
                          src={`/material/file/${att.attachment}`}
                          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <Box
                          component="img"
                          src={attachmentPlaceholder}
                          alt="Attachment placeholder"
                          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      )}
                    </Box>
                  </Tooltip>
                );
              })}
              {attachments.length > MAX_ATTACHMENT_PREVIEW && (
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: "text.secondary",
                    backgroundColor: "grey.100",
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                  }}
                >
                  +{attachments.length - MAX_ATTACHMENT_PREVIEW}
                </Typography>
              )}
            </Box>
          );
        },
      }),
    ],
    []
  );

  const isSearchActive = searchMode === "selected" || searchMode === "no-match";
  const emptyMessage = !isSearchActive
    ? "Silakan pilih material dari suggestion untuk menampilkan data"
    : "Maaf, data material tidak ditemukan. Coba gunakan kata kunci atau filter lain.";

  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
          mb: 4,
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: 800, color: "text.primary", letterSpacing: "-0.5px" }}
        >
          Material Search
        </Typography>
        <Button
          variant="contained"
          startIcon={<Download />}
          color="primary"
          sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 600, px: 3 }}
        >
          Download To Excel
        </Button>
      </Box>

      <Box
        sx={{
          mb: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 2.5,
          width: "100%",
          maxWidth: { md: "800px" },
        }}
      >
        <Box sx={{ width: "100%" }}>
          <SearchSuggestionField
            placeholder="Search materials by name, code, description, alias, UoM..."
            onSearch={handleSearchChange}
            onInputValueChange={handleSearchInputChange}
            apiEndpoint="/material/suggestions"
            sx={{ bgcolor: "background.paper" }}
          />
        </Box>
        <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 400 } }}>
          <Select
            displayEmpty
            value={selectedGroup}
            onChange={handleGroupChange}
            renderValue={selected => {
              if (selected === "") {
                return (
                  <Typography sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                    Select Material Group
                  </Typography>
                );
              }
              const selectedOption = groups.find(g => g.id === selected);
              return (
                <Typography
                  sx={{
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    fontSize: "0.875rem",
                    lineHeight: 1.2,
                    py: 0.5,
                  }}
                >
                  {selectedOption ? `${selectedOption.code} - ${selectedOption.name}` : selected}
                </Typography>
              );
            }}
            sx={{
              bgcolor: "background.paper",
              "& .MuiSelect-select": {
                whiteSpace: "normal !important",
                display: "flex",
                alignItems: "center",
                minHeight: "1.5rem",
                py: 1,
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  width: "auto",

                  maxHeight: 400,
                },
              },
            }}
          >
            <MenuItem value="" sx={{ whiteSpace: "normal" }}>
              Select Material Group
            </MenuItem>
            {groups.map(group => (
              <MenuItem
                key={group.id}
                value={group.id}
                sx={{
                  whiteSpace: "normal",
                  py: 1.5,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  "&:last-child": { borderBottom: 0 },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {group.code} - {group.name}
                </Typography>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <TableSorting
          rowsData={materials}
          columns={columns}
          sorting={sorting}
          setSorting={setSorting}
          loading={loading}
          emptyMessage={emptyMessage}
        />
      </Box>

      <Box sx={{ py: 3, display: "flex", justifyContent: "center" }}>
        <Pagination
          count={pagination.totalPages}
          page={pagination.page}
          onChange={handlePageChange}
          color="primary"
        />
      </Box>

      {/* Attachments Dialog */}
      <Dialog
        open={attachmentsDialogOpen}
        onClose={handleCloseAttachmentsDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Attachments</DialogTitle>
        <DialogContent dividers>
          <List>
            {selectedMaterial?.attachments?.map((att, index) => (
              <ListItem
                key={index}
                secondaryAction={
                  <IconButton edge="end" onClick={() => handleViewAttachment(att)}>
                    <Visibility />
                  </IconButton>
                }
              >
                <ListItemIcon>
                  {att.attachment
                    .split(".")
                    .pop()
                    .match(/(jpg|jpeg|png|gif)$/i) ? (
                    <ImageIcon color="primary" />
                  ) : (
                    <InsertDriveFile />
                  )}
                </ListItemIcon>
                <ListItemText primary={att.attachment} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAttachmentsDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Alias Dialog */}
      <Dialog open={aliasDialogOpen} onClose={handleCloseAliasDialog}>
        <DialogTitle>Material Aliases</DialogTitle>
        <DialogContent dividers>
          <Box
            sx={{
              pt: 1,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              width: "100%",
              maxWidth: 400,
            }}
          >
            <TextField label="Alias 1" fullWidth value={aliases.alias1} disabled />
            <TextField label="Alias 2" fullWidth value={aliases.alias2} disabled />
            <TextField label="Alias 3" fullWidth value={aliases.alias3} disabled />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAliasDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleActionMenuClose}
        PaperProps={{ elevation: 3, sx: { minWidth: 150, mt: 1 } }}
      >
        <MenuItem
          onClick={() => {
            handleOpenAttachmentsDialog(menuMaterial);
            handleActionMenuClose();
          }}
        >
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          <ListItemText>Attachment</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            handleOpenAliasDialog(menuMaterial);
            handleActionMenuClose();
          }}
        >
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Change</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            showSnackbar("Extend feature coming soon", "info");
            handleActionMenuClose();
          }}
        >
          <ListItemIcon>
            <InsertDriveFile fontSize="small" />
          </ListItemIcon>
          <ListItemText>Extend</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
