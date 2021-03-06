import Validator from 'validator';
import isEmpty from 'lodash/isEmpty';


//Signup form server-side validation
export default function validateInput(data){
	let errors = {};
	
	if(Validator.isEmpty(data.fullName)){
		errors.fullName = "This field is required";
	}
	
	if(Validator.isEmpty(data.username)){
		errors.username = "This field is required";
	}
	
	if(Validator.isEmpty(data.email)){
		errors.email = "This field is required";
	}else{
		if(!Validator.isEmail(data.email)){
			errors.email = "Email is invalid";
		}
	}
	
	if(Validator.isEmpty(data.password)){
		errors.password = "This field is required";
	}
	
	if(Validator.isEmpty(data.passwordConfirmation)){
		errors.passwordConfirmation = "This field is required";
	}else{
		if(!Validator.equals(data.password, data.passwordConfirmation)){
			errors.passwordConfirmation = "Passwords must match";
		}
	}
	
	return {		
		errors,
		isValid: isEmpty(errors)
	}
}