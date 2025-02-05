// Maximilian Rode, 22972602
// Chang Liu, 22963247

import java.util.LinkedList;

// This class will be provided

public class Contact {

	private String name;
	private LinkedList<String> nicknames;

	private String email;
	private String telephone;

	public Contact(String email) {
		setEmail(email);
		this.name = "";
		this.nicknames = new LinkedList<String>();
		this.email = email;
		this.telephone = "unknown";
	}

	public String getEmail() {
		return this.email;
	}

	public void setNickname(String nickname) {
		nicknames.add(nickname);
	}

	public void setName(String name) {
		this.name = name;
	}

	private void setEmail(String email) {
		if (!email.contains("@") || !email.contains(".")) {
			throw new IllegalArgumentException("Invalid email address!");
		}
		this.email = email;
	}

	public void setTelephone(String telephone) {
		String testdigits = "0123456789/+ ";
		for (char c : telephone.toCharArray()) {
			if (testdigits.indexOf(c) == -1) {
				throw new IllegalArgumentException("Invalid phone number!");
			}
		}
		this.telephone = telephone;
	}

	public String toString() {
		String s = "";
		s += name + ", Nicknames:";
		for (int i = 0; i < nicknames.size(); i++) {
			s += " " + nicknames.get(i) + (i == nicknames.size() - 1 ? "" : ",");
		}
		s += "\n";
		s += "Telephone: " + telephone + ", Email: " + email;
		return s;
	}

}
