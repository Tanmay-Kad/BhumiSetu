const getHealth = (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "BhumiSetu Backend is running",
  });
};

module.exports = {
  getHealth,
};
