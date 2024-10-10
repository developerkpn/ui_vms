import { TextField, IconButton } from "@mui/material";
import { Close, Search } from "@mui/icons-material";
import { debounce } from "lodash";
import { useEffect, useState, useRef, forwardRef, useCallback } from "react";


const SearchFieldComp = ({ setQuery }) => {
    const [que, setQue] = useState("");
    const fieldRef = useRef();
    const updateQuery = useCallback(
        debounce(value => {
            setQuery(value);
        }, 500),
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
            sx={{ width: "30rem", mb: 2 }}
            placeholder="Search..."
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
