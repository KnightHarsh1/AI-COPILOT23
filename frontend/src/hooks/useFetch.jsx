import { useEffect, useState } from 'react';

function useFetch(fetcher, dependencies = []) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setError(null);

    fetcher()
      .then(response => {
        if (active) setData(response);
      })
      .catch(err => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, dependencies);

  return { data, isLoading, error };
}

export default useFetch;
