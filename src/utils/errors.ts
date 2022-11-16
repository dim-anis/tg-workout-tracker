export class BaseError extends Error {
	statusCode: number;

	constructor(statusCode: number, message: string) {
		super(message);

		Object.setPrototypeOf(this, new.target.prototype);
		this.name = Error.name;
		this.statusCode = statusCode;
		Error.captureStackTrace(this);
	}
}

// Export class NotFoundError extends BaseError {
// 	propertyName: string;

// 	constructor(propertyName: string) {
// 		super(404, `Property ${propertyName} not found.`);

// 		this.propertyName = propertyName;
// 	}
// }
