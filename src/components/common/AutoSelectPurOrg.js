import { LazySelectComp } from '../common/LazySelectComp';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { useState, useRef, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';

export default function AutoSelectPurOrg({ name, label, control, rules, company, t, helperText, ...props }) {
  const axiosPrivate = useAxiosPrivate();
  const limit = 20;
  const [dataRow, setDataRow] = useState([]);
  const compan = useRef(company);
  let paginationRef = useRef({
    offset: 0,
    hasMore: true,
  });

  const [searchQuery, setQuery] = useState('');
  const [isLoading, setLoading] = useState(false);

  const fetchData = async (limit, offset, company, q) => {
    console.log('fetchData runs');
    console.log(limit, offset, company, q);
    if (company !== '') {
      setLoading(true);
      try {
        const { data: rowData } = await axiosPrivate.get(
          `master/getporg?company=${company}&limit=${limit}&offset=${offset}&q=${q}`
        );
        const max = rowData.count;
        return {
          list: rowData.data,
          pagination: {
            offset: offset + limit,
            hasMore: offset + limit < max,
          },
        };
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };
  const fetchMore = debounce(async (searchQuery) => {
    if (!paginationRef.current.hasMore) return;
    setLoading(true);
    try {
      const { list, pagination: resPagination } = await fetchData(
        limit,
        paginationRef.current.offset,
        compan.current,
        searchQuery
      );
      const dataList = list?.map((item) => ({
        ...item,
        value: item.porg_id,
        id: item.porg_id,
        label: item.porg_id,
      }));

      setDataRow((prev) => [...prev, ...dataList.filter((x) => !prev.map((u) => u.value).includes(x.value))]);

      paginationRef.current = resPagination;
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, 500);
  useEffect(() => {
    (async () => {
      compan.current = company;
      paginationRef.current.offset = 0;
      try {
        const { list, pagination: resPagination } = await fetchData(
          limit,
          paginationRef.current.offset,
          compan.current,
          searchQuery
        );
        const dataList = list?.map((item) => ({
          ...item,
          value: item.porg_id,
          id: item.porg_id,
          label: item.porg_id,
        }));
        setDataRow([...dataList]);
        paginationRef.current = resPagination;
      } catch (error) {
        console.error(error);
      }
    })();
  }, [searchQuery, company]);

  return (
    <>
      <LazySelectComp
        loading={isLoading}
        options={dataRow}
        onFetchMore={fetchMore}
        hasMore={paginationRef.current.hasMore}
        name={name}
        label={label}
        control={control}
        rules={rules}
        defaultValue={null}
        helperText={helperText}
        t={t}
        onChangeovr={debounce((e) => {
          setQuery(e?.target?.value?.toUpperCase());
        }, 1000)}
        onBlurovr={debounce((e) => {
          setQuery(e?.target?.value?.toUpperCase());
        }, 1000)}
        searchQuery={searchQuery}
        {...props}
      />
    </>
  );
}
