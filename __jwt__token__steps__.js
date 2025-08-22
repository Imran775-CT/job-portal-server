/**
 * 1. after successful login: generate a jwt token;
 *    npm i jsonwebtoken, cookie-perser
 *    jwt.sign(payload, secret, (expiresIn:'id'))
 * 
 * 2. send token ( generated in the server side) to the client side 
 * local storrrage ---> easier
 * 
 * httpOnly cookies ===> better
 * 
 * 
 * 3.    for sensitive or secure or private or protected apis: send token to the server side 
 * app.use(cors({
   origin: ['http://localhost:5173'],
   credentials: true,
 }));
 * 
 * in the client side :
 *  use axios get, post , delete , patch for secure apis and must use : {withcredentials: true}
 * 4.  validate the token in the server side :
 *          if valid: provide data
 *          if not valid: logout
 * 
 * 
 * 
 */
