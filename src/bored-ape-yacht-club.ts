import { Transfer } from "../generated/BoredApeYachtClub/BoredApeYachtClub";
import { Token, TransferEvent, User } from "../generated/schema";
import { Address, BigInt } from "@graphprotocol/graph-ts";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Creates or loads a User entity
 * @param address The user's address
 * @returns User entity
 */
function getOrCreateUser(address: Address): User {
	let id = address.toHex();
	let user = User.load(id);
	if (!user) {
		user = new User(id);
		user.totalMints = BigInt.fromI32(0);
		user.totalTransfers = BigInt.fromI32(0);
		user.save();
	}
	return user;
}

export function handleTransfer(event: Transfer): void {
	// Input validation
	if (event.params.tokenId === null) {
		return;
	}

	let fromUser = getOrCreateUser(event.params.from);
	let toUser = getOrCreateUser(event.params.to);

	let tokenIdStr = event.params.tokenId.toString();
	let token = Token.load(tokenIdStr);
	if (!token) {
		token = new Token(tokenIdStr);
		token.tokenID = event.params.tokenId;
		token.transferCount = BigInt.fromI32(0);
	}
	token.owner = toUser.id;
	token.transferCount = token.transferCount.plus(BigInt.fromI32(1));
	token.save();

	// Create transfer event
	let evtId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
	let transfer = new TransferEvent(evtId);
	transfer.from = fromUser.id;
	transfer.to = toUser.id;
	transfer.token = token.id;
	transfer.blockNumber = event.block.number;
	transfer.timestamp = event.block.timestamp;
	transfer.save();

	// Update counters
	let fromAddress = event.params.from.toHex();
	let toAddress = event.params.to.toHex();

	if (fromAddress == ZERO_ADDRESS) {
		// Mint
		toUser.totalMints = toUser.totalMints.plus(BigInt.fromI32(1));
	} else if (toAddress != ZERO_ADDRESS) {
		// Normal transfer
		fromUser.totalTransfers = fromUser.totalTransfers.plus(BigInt.fromI32(1));
		toUser.totalTransfers = toUser.totalTransfers.plus(BigInt.fromI32(1));
	}

	fromUser.save();
	toUser.save();
}
