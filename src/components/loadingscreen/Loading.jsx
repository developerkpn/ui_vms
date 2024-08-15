import { CircularProgress } from "@mui/material";
export default function LoadingSuspense() {
    return (
        <>
            <div
                style={{
                    minWidth: "100vw",
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <CircularProgress />
            </div>
        </>
    );
}
