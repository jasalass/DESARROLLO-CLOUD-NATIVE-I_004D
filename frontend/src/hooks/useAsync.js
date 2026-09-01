import { useEffect, useState } from "react";

// Ejecuta fn() al montar (o cuando cambian las deps) y expone { data, loading, error }.
// fn debe ser una función que retorna una promesa; se re-crea en cada render, así que
// se recomienda envolverla en useCallback en el componente que la usa si depende de props.
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelado = false;
    setState({ data: null, loading: true, error: null });

    fn()
      .then((data) => {
        if (!cancelado) setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (!cancelado) setState({ data: null, loading: false, error });
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
