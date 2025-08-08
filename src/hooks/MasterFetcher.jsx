import { useState, useEffect, useCallback } from "react";
import useAxiosPrivate from "./useAxiosPrivate";

export const useMasterFetcher = ({ link, param }) => {
  const axiosPrivate = useAxiosPrivate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [refresh, setRefresh] = useState(true);
  const [paramq, setParam] = useState(param);

  // useEffect(() => {
  //   setParam(param);
  // }, [param]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      if (refresh && link) {
        setLoading(true);
        let URLQuery;
        if (paramq && Object.keys(paramq).length > 0) {
          URLQuery = new URLSearchParams(paramq);
        }
        console.log(URLQuery);
        try {
          const { data } = await axiosPrivate.get(
            `${link}?${URLQuery ? URLQuery.toString() : ""}`,
            {
              signal: controller.signal,
            }
          );
          setData(data.data);
          setError(null);
          return;
        } catch (error) {
          setError(error);
        } finally {
          setLoading(false);
          setRefresh(false);
        }
      }
    })();
    return () => {
      controller.abort();
    };
  }, [refresh, link, paramq]);
  const refresh_data = useCallback(
    q => {
      setRefresh(true);
      if (q) {
        setParam(q);
      }
    },
    [param]
  );
  return { loading, error, data, refresh_data };
};
