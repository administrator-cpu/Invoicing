export const formatINR = (value) => {

  return new Intl.NumberFormat(

    "en-IN",

    {

      style: "currency",

      currency: "INR"

    }

  ).format(value || 0);

};