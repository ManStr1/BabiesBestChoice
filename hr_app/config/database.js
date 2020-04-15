module.exports = {
  hrPool: {
    user: process.env.HR_USER="abdulla",
    password: process.env.HR_PASSWORD="A2012345620a",
    connectString: process.env.HR_CONNECTIONSTRING="localhost:1521/XEPDB1",
    poolMin: 10,
    poolMax: 10,
    poolIncrement: 0
  }
}; 
