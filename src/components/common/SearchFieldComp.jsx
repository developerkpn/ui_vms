import { Close, Search } from "@mui/icons-material";
import { IconButton, TextField } from "@mui/material";
import { debounce } from "lodash";
import { useCallback, useEffect, useRef, useState } from "react";

const SearchFieldComp = ({ setQuery, placeholder }) => {
  const [que, setQue] = useState("");
  const fieldRef = useRef();
  const updateQuery = useCallback(
    debounce(value => {
      setQuery(value);
    }, 800),
    []
  );
  const onChangeQuery = useCallback(value => {
    setQue(value);
  }, []);
  useEffect(() => {
    updateQuery(que);
  }, [que]);
  const clearQue = useCallback(() => {
    setQue("");
  }, []);
  const clickAction = () => {
    if (que == "") {
      fieldRef.current.focus();
    } else {
      clearQue();
    }
  };
  return (
    <TextField
      sx={{ width: "30rem", my: 2 }}
      placeholder={placeholder ?? "Search ..."}
      value={que}
      onChange={e => {
        onChangeQuery(e.target.value);
      }}
      inputRef={fieldRef}
      InputProps={{
        endAdornment: (
          <IconButton
            onClick={e => {
              clickAction();
            }}
          >
            {que == "" ? <Search /> : <Close />}
          </IconButton>
        ),
      }}
    />
  );
};

export default SearchFieldComp;
