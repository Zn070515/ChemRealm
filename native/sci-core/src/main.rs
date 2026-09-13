use std::io::{self, Read};

fn main() {
    let mut input = String::new();
    if let Err(error) = io::stdin().read_to_string(&mut input) {
        eprintln!("sci-core-host: failed to read stdin: {error}");
        std::process::exit(2);
    }
    match chemrealm_sci_core::solve_canonical_json(&input) {
        Ok(output) => println!("{output}"),
        Err(error) => {
            eprintln!("sci-core-host: {error}");
            std::process::exit(1);
        }
    }
}
