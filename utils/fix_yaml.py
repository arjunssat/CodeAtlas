import re

def add_indentation(text):
    # This pattern matches lines that don't start with a hyphen or whitespace
    pattern = r'^(?![-\s])(.*)$'
    
    # Replace with 4 spaces followed by the captured content
    result = re.sub(pattern, r'    \1', text, flags=re.MULTILINE)
    
    return result


if __name__ == "__main__":
    # Example usage
    text = """This line will be indented
    - This line won't be indented
    This line won't be indented either
    Another line that will be indented"""

    indented_text = add_indentation(text)