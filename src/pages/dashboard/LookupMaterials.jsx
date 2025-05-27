import { Close, Download, Image, InsertDriveFile, PictureAsPdf } from "@mui/icons-material";
import {
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
  MenuItem,
  Pagination,
  Select,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import { createColumnHelper } from "@tanstack/react-table";
import { debounce } from "lodash";
import moment from "moment";
import { useCallback, useEffect, useMemo, useState } from "react";
import SearchFieldComp from "src/components/common/SearchFieldComp";
import TooltipButton from "src/components/common/TooltipButton";
import TableSimple from "src/components/table/TableSimple";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";

const columnHelper = createColumnHelper();

export default function LookupMaterials() {
  const axiosPrivate = useAxiosPrivate();
  const [searchQuery, setSearchQuery] = useState("");
  const [materials, setMaterials] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [subGroups, setSubGroups] = useState([]);
  const [selectedSubGroup, setSelectedSubGroup] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
  });
  const [attachmentsDialogOpen, setAttachmentsDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(false);

  // Fetch groups on component mount
  useEffect(() => {
    fetchGroups();
  }, []);

  // Fetch groups
  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosPrivate.get("/material/groups");
      setGroups(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch groups:", error);
      setError("Failed to load material groups. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch subgroups when a group is selected
  useEffect(() => {
    if (selectedGroup) {
      fetchSubGroups(selectedGroup);
    } else {
      setSubGroups([]);
      setSelectedSubGroup("");
    }
  }, [selectedGroup]);

  // Fetch materials when a subgroup is selected
  useEffect(() => {
    if (selectedSubGroup) {
      fetchMaterialsBySubGroup(selectedSubGroup);
    } else if (selectedGroup && activeTab === 1) {
      fetchMaterialsByGroup(selectedGroup);
    } else if (activeTab === 1) {
      setMaterials([]);
    }
  }, [selectedSubGroup, selectedGroup]);

  // Fetch subgroups
  const fetchSubGroups = async groupId => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosPrivate.get(`/material/groups/${groupId}/subgroups`);
      setSubGroups(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch subgroups:", error);
      setError("Failed to load subgroups. Please try again.");
      setSubGroups([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch materials by group
  const fetchMaterialsByGroup = async (groupId, page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosPrivate.get(
        `/material/groups/${groupId}/materials?page=${page}&pageSize=${pagination.pageSize}`
      );
      setMaterials(response.data.data || []);
      setPagination({
        ...pagination,
        page,
        totalCount: response.data.pagination.totalCount,
        totalPages: response.data.pagination.totalPages,
      });
    } catch (error) {
      console.error("Failed to fetch materials by group:", error);
      setError("Failed to load materials. Please try again.");
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch materials by subgroup
  const fetchMaterialsBySubGroup = async (subGroupId, page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosPrivate.get(
        `/material/subgroups/${subGroupId}/materials?page=${page}&pageSize=${pagination.pageSize}`
      );
      setMaterials(response.data.data || []);
      setPagination({
        ...pagination,
        page,
        totalCount: response.data.pagination.totalCount,
        totalPages: response.data.pagination.totalPages,
      });
    } catch (error) {
      console.error("Failed to fetch materials:", error);
      setError("Failed to load materials. Please try again.");
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  // Search materials with debounce
  const debouncedSearch = useCallback(
    debounce(async (term, page = 1) => {
      if (!term || term.trim() === "") {
        setMaterials([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const encodedSearchTerm = encodeURIComponent(term.trim());
        const response = await axiosPrivate.get(
          `/material/search?q=${encodedSearchTerm}&page=${page}&pageSize=${pagination.pageSize}`
        );
        setMaterials(response.data.data || []);
        setPagination({
          ...pagination,
          page,
          totalCount: response.data.pagination.totalCount,
          totalPages: response.data.pagination.totalPages,
        });
      } catch (error) {
        console.error("Search failed:", error);
        setError("Search failed. Please try again.");
        setMaterials([]);
      } finally {
        setLoading(false);
      }
    }, 500),
    [pagination.pageSize]
  );

  // Handle page change
  const handlePageChange = (event, newPage) => {
    if (activeTab === 0 && searchQuery) {
      debouncedSearch(searchQuery, newPage);
    } else if (activeTab === 1) {
      if (selectedSubGroup) {
        fetchMaterialsBySubGroup(selectedSubGroup, newPage);
      } else if (selectedGroup) {
        fetchMaterialsByGroup(selectedGroup, newPage);
      }
    }
  };

  // Handle search input change
  const handleSearchChange = value => {
    setSearchQuery(value);

    // Reset pagination to page 1 when search term changes
    setPagination({
      ...pagination,
      page: 1,
    });

    // Don't clear results immediately when typing, just start loading state
    if (value && value.trim() !== "") {
      setLoading(true);
    } else {
      setMaterials([]);
    }

    debouncedSearch(value, 1); // Reset to page 1
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setSearchQuery("");
    setMaterials([]);

    if (newValue === 0) {
      // Reset selection when switching to search tab
      setSelectedGroup("");
      setSelectedSubGroup("");
    } else {
      // Fetch groups if needed when switching to browse tab
      if (groups.length === 0) {
        fetchGroups();
      }
    }
  };

  // Handle group selection
  const handleGroupSelect = groupId => {
    setSelectedGroup(groupId);
    setSelectedSubGroup(""); // Reset subgroup when group changes

    // Reset pagination to page 1
    setPagination({
      ...pagination,
      page: 1,
    });

    if (groupId === "") {
      setMaterials([]);
    }
  };

  // Handle subgroup selection
  const handleSubGroupSelect = subGroupId => {
    setSelectedSubGroup(subGroupId);

    // Reset pagination to page 1
    setPagination({
      ...pagination,
      page: 1,
    });
  };

  // Handle clear group
  const handleClearGroup = () => {
    setSelectedGroup("");
    setSelectedSubGroup("");
    setMaterials([]);
  };

  // Handle clear subgroup
  const handleClearSubgroup = () => {
    setSelectedSubGroup("");
    setMaterials([]);
  };

  // Open attachments dialog
  const handleOpenAttachmentsDialog = material => {
    setSelectedMaterial(material);
    setAttachmentsDialogOpen(true);
  };

  // Close attachments dialog
  const handleCloseAttachmentsDialog = () => {
    setAttachmentsDialogOpen(false);
    setSelectedMaterial(null);
  };

  // Get icon for file type
  const getFileIcon = fileType => {
    if (!fileType) return <InsertDriveFile />;

    const type = fileType.toLowerCase();

    if (type.includes("pdf")) return <PictureAsPdf color="error" />;
    if (
      type.includes("jpg") ||
      type.includes("jpeg") ||
      type.includes("png") ||
      type.includes("gif") ||
      type.includes("image")
    )
      return <Image color="primary" />;

    return <InsertDriveFile />;
  };

  // TODO: Download attachment
  const handleDownloadAttachment = async attachment => {
    try {
      setDownloadLoading(true);
      // Get the file URL from the attachment object
    } catch (error) {
      console.error("Failed to download attachment:", error);
    } finally {
      setDownloadLoading(false);
    }
  };

  // Table columns
  const columns = useMemo(
    () => [
      columnHelper.accessor("fullCode", {
        header: "Code",
        cell: ({ getValue, row }) => {
          return getValue() || "-";
        },
      }),
      columnHelper.accessor("name", {
        header: "Material Name",
        cell: ({ getValue }) => getValue() || "-",
      }),
      columnHelper.accessor("description", {
        header: "Description",
        cell: ({ getValue }) => getValue() || "-",
      }),
      columnHelper.accessor(
        row => ({
          groupCode: row.groupCode,
          groupName: row.groupName,
        }),
        {
          id: "group",
          header: "Group",
          cell: ({ getValue }) => {
            const group = getValue();
            return group && group.groupCode && group.groupName
              ? `${group.groupCode} - ${group.groupName}`
              : "-";
          },
        }
      ),
      columnHelper.accessor(
        row => ({
          subGroupCode: row.subGroupCode,
          subGroupName: row.subGroupName,
        }),
        {
          id: "subgroup",
          header: "Subgroup",
          cell: ({ getValue }) => {
            const subgroup = getValue();
            return subgroup && subgroup.subGroupCode && subgroup.subGroupName
              ? `${subgroup.subGroupCode} - ${subgroup.subGroupName}`
              : "-";
          },
        }
      ),
      columnHelper.accessor("created_at", {
        header: "Created At",
        cell: ({ getValue }) => (getValue() ? moment(getValue()).format("YYYY-MM-DD") : "-"),
      }),
      columnHelper.display({
        header: "Actions",
        id: "actions",
        cell: ({ row }) => {
          const hasAttachments = row.original.attachments && row.original.attachments.length > 0;

          return (
            <Box sx={{ display: "flex", gap: 2 }}>
              <TooltipButton
                Icon={<Download />}
                TooltipText={
                  hasAttachments
                    ? `View & Download Attachments (${row.original.attachments.length})`
                    : "No attachments available"
                }
                OnClick={() => {
                  if (hasAttachments) {
                    handleOpenAttachmentsDialog(row.original);
                  }
                }}
                disabled={!hasAttachments}
                sx={!hasAttachments ? { opacity: 0.6 } : {}}
              />
            </Box>
          );
        },
      }),
    ],
    []
  );

  // Determine if we should show "no results" message
  const showNoResultsMessage = () => {
    return searchQuery.trim() !== "" && !loading && materials.length === 0;
  };

  // Determine if we should show the table
  const showResultsTable = () => {
    return materials.length > 0;
  };

  // Determine if we should show the initial search prompt
  const showSearchPrompt = () => {
    return searchQuery.trim() === "" && !loading;
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
      }}
    >
      <Box sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Search" />
          <Tab label="Browse by Category" />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 3 }}>
            <SearchFieldComp
              setQuery={handleSearchChange}
              placeholder="Search materials by name, code, description..."
            />
            {loading && <CircularProgress size={24} />}
          </Box>

          {error && (
            <Typography color="error" variant="body2" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          {showResultsTable() && (
            <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
              <Box sx={{ flexGrow: 1 }}>
                <TableSimple
                  columns={columns}
                  rowsData={materials}
                  sx={{
                    height: "100%",
                    width: "100%",
                  }}
                />
              </Box>
              {pagination.totalPages > 1 && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  <Pagination
                    count={pagination.totalPages}
                    page={pagination.page}
                    onChange={handlePageChange}
                    color="primary"
                  />
                </Box>
              )}
            </Box>
          )}

          {!showResultsTable() && (
            <Typography variant="body1" color="text.secondary">
              {showNoResultsMessage()
                ? "No materials found for your search. Try different keywords."
                : showSearchPrompt()
                ? "Enter a search term to find materials."
                : null}
            </Typography>
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap", mb: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <FormControl sx={{ minWidth: 200 }}>
                <Select
                  value={selectedGroup}
                  displayEmpty
                  onChange={e => handleGroupSelect(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Select Material Group</em>
                  </MenuItem>
                  {groups.map(group => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.code} - {group.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {selectedGroup && (
                <Tooltip title="Clear group selection">
                  <IconButton onClick={handleClearGroup} size="small" sx={{ ml: 1 }}>
                    <Close fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            {selectedGroup && (
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <FormControl sx={{ minWidth: 200 }}>
                  <Select
                    value={selectedSubGroup}
                    displayEmpty
                    onChange={e => handleSubGroupSelect(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>Select Subgroup</em>
                    </MenuItem>
                    {subGroups.map(subGroup => (
                      <MenuItem key={subGroup.id} value={subGroup.id}>
                        {subGroup.code} - {subGroup.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {selectedSubGroup && (
                  <Tooltip title="Clear subgroup selection">
                    <IconButton onClick={handleClearSubgroup} size="small" sx={{ ml: 1 }}>
                      <Close fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            )}

            {loading && <CircularProgress size={24} />}
          </Box>

          {error && (
            <Typography color="error" variant="body2" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          {materials.length > 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
              <Box sx={{ flexGrow: 1 }}>
                <TableSimple
                  columns={columns}
                  rowsData={materials}
                  sx={{
                    height: "100%",
                    width: "100%",
                  }}
                />
              </Box>
              {pagination.totalPages > 1 && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  <Pagination
                    count={pagination.totalPages}
                    page={pagination.page}
                    onChange={handlePageChange}
                    color="primary"
                  />
                </Box>
              )}
            </Box>
          ) : (
            <Typography variant="body1" color="text.secondary">
              {selectedGroup && !loading
                ? selectedSubGroup
                  ? "No materials found in this subgroup."
                  : "No materials found in this group."
                : "Select a group to view materials. You can further filter by subgroup."}
            </Typography>
          )}
        </Box>
      )}

      {/* Attachments Dialog */}
      <Dialog
        open={attachmentsDialogOpen}
        onClose={handleCloseAttachmentsDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6">
              Attachments for {selectedMaterial?.name || "Material"}
            </Typography>
            <IconButton onClick={handleCloseAttachmentsDialog}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent>
          {selectedMaterial && (
            <>
              {selectedMaterial.attachments && selectedMaterial.attachments.length > 0 ? (
                <List>
                  {selectedMaterial.attachments.map((attachment, index) => (
                    <ListItem
                      key={attachment.id || index}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          onClick={() => handleDownloadAttachment(attachment)}
                          disabled={downloadLoading}
                        >
                          {downloadLoading ? <CircularProgress size={24} /> : <Download />}
                        </IconButton>
                      }
                    >
                      <ListItemIcon>
                        {getFileIcon(attachment.type || attachment.fileType)}
                      </ListItemIcon>
                      <ListItemText
                        primary={attachment.attachment}
                        secondary={attachment.type || attachment.fileType || "Unknown file type"}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No attachments available for this material.
                  </Typography>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAttachmentsDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
