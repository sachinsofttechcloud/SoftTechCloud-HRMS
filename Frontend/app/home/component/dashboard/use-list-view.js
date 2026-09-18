"use client";

import { useMemo, useState } from "react";

export function useListView(
  data,
  { searchKey, filterKey, filterValue, initialPageSize = 10 },
) {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let rows = data;

    if (filterKey && filterValue) {
      rows = rows.filter((row) => row[filterKey] === filterValue);
    }

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      rows = rows.filter((row) =>
        String(row[searchKey] || "")
          .toLowerCase()
          .includes(term),
      );
    }

    return rows;
  }, [data, filterKey, filterValue, search, searchKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const changeSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const changePageSize = (value) => {
    setPageSize(value);
    setPage(1);
  };

  return {
    search,
    setSearch: changeSearch,
    pageSize,
    setPageSize: changePageSize,
    page: safePage,
    setPage,
    totalPages,
    total: filtered.length,
    rows,
  };
}
